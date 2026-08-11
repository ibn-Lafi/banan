import { calculateLineTax, sumInvoiceTotals } from "@banan/shared";
import type { CreateReturnInput } from "@banan/validation";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { recomputeInvoiceStatus } from "./balanceService.js";

export interface CreateReturnContext {
  companyId: string;
  userId: string;
  userRole: "admin" | "rep";
}

/**
 * القسم 10: المرتجع يُنشأ استناداً لفاتورة صادرة، ولا يتجاوز remaining returnable
 * quantity على مستوى كل بند فاتورة (invoice_item) — Pre-Implementation Review #2.
 */
export async function createReturn(input: CreateReturnInput, ctx: CreateReturnContext) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, company_id, rep_id, status")
    .eq("id", input.invoice_id)
    .eq("company_id", ctx.companyId)
    .single();

  if (invoiceError || !invoice) throw ApiError.notFound("الفاتورة غير موجودة");
  if (ctx.userRole === "rep" && invoice.rep_id !== ctx.userId) {
    throw ApiError.forbidden("لا يمكنك إنشاء مرتجع لفاتورة ليست لك");
  }
  if (!["issued", "partially_paid", "paid"].includes(invoice.status)) {
    throw ApiError.conflict("لا يمكن إنشاء مرتجع لفاتورة Draft أو ملغاة");
  }

  const invoiceItemIds = input.items.map((i) => i.invoice_item_id);
  const { data: invoiceItems, error: itemsError } = await supabaseAdmin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .in("id", invoiceItemIds);
  if (itemsError) throw itemsError;
  if (!invoiceItems || invoiceItems.length !== invoiceItemIds.length) {
    throw ApiError.badRequest("أحد بنود الفاتورة غير موجود");
  }

  const itemMap = new Map(invoiceItems.map((i) => [i.id, i]));
  const returnLines = input.items.map((requested) => {
    const invoiceItem = itemMap.get(requested.invoice_item_id)!;
    const remaining = Number(invoiceItem.quantity) - Number(invoiceItem.returned_quantity);
    if (requested.returned_quantity > remaining) {
      throw ApiError.badRequest(
        `الكمية المرتجعة تتجاوز المتبقي القابل للإرجاع (${remaining}) للمنتج "${invoiceItem.product_name_snapshot}"`,
      );
    }
    const tax = calculateLineTax({
      unitPriceGross: Number(invoiceItem.unit_price),
      quantity: requested.returned_quantity,
      vatRate: Number(invoiceItem.vat_rate),
    });
    return {
      invoice_item_id: invoiceItem.id,
      returned_quantity: requested.returned_quantity,
      unit_price_at_return: Number(invoiceItem.unit_price),
      ...tax,
    };
  });

  const totals = sumInvoiceTotals(returnLines);

  const { data: sequenceNumber, error: sequenceError } = await supabaseAdmin.rpc(
    "next_document_number",
    { p_company_id: ctx.companyId, p_document_type: "return" },
  );
  if (sequenceError || sequenceNumber == null) throw sequenceError ?? new Error("Failed to allocate return number");
  const returnNumber = `RET-${String(sequenceNumber).padStart(6, "0")}`;

  const { data: createdReturn, error: returnError } = await supabaseAdmin
    .from("returns")
    .insert({
      company_id: ctx.companyId,
      return_number: returnNumber,
      invoice_id: invoice.id,
      rep_id: invoice.rep_id,
      return_date: input.return_date,
      total_amount_gross: totals.original_amount_gross,
      total_amount_net: totals.original_amount_net,
      total_vat_amount: totals.original_vat_amount,
      created_by: ctx.userId,
    })
    .select()
    .single();
  if (returnError || !createdReturn) throw returnError ?? new Error("Failed to create return");

  const { error: returnItemsError } = await supabaseAdmin
    .from("return_items")
    .insert(
      returnLines.map((line) => ({
        return_id: createdReturn.id,
        invoice_item_id: line.invoice_item_id,
        returned_quantity: line.returned_quantity,
        unit_price_at_return: line.unit_price_at_return,
        line_net: line.line_net,
        line_vat: line.line_vat,
        line_gross: line.line_gross,
      })),
    );
  if (returnItemsError) throw returnItemsError;

  for (const line of returnLines) {
    const invoiceItem = itemMap.get(line.invoice_item_id)!;
    const newReturnedQty = Number(invoiceItem.returned_quantity) + line.returned_quantity;
    const { error: updateError } = await supabaseAdmin
      .from("invoice_items")
      .update({ returned_quantity: newReturnedQty })
      .eq("id", line.invoice_item_id);
    if (updateError) throw updateError;
  }

  await recomputeInvoiceStatus(invoice.id);

  return createdReturn;
}
