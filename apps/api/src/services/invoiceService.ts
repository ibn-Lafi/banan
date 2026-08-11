import { calculateLineTax, sumInvoiceTotals, buildZatcaQrPayload } from "@banan/shared";
import type { CreateInvoiceDraftInput } from "@banan/validation";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";

export interface CreateDraftContext {
  companyId: string;
  repId: string;
}

/** القسم 8: إنشاء Draft — كل الحسابات المالية تُنفَّذ في Backend حصراً (القسم 21) */
export async function createInvoiceDraft(input: CreateInvoiceDraftInput, ctx: CreateDraftContext) {
  const productIds = input.items.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price_gross, vat_rate, status")
    .eq("company_id", ctx.companyId)
    .in("id", productIds);

  if (productsError) throw productsError;
  if (!products || products.length !== new Set(productIds).size) {
    throw ApiError.badRequest("أحد المنتجات غير موجود");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = input.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product) throw ApiError.badRequest("منتج غير موجود");
    if (product.status !== "active") {
      throw ApiError.badRequest(`المنتج "${product.name}" غير متاح حالياً`);
    }
    const tax = calculateLineTax({
      unitPriceGross: item.unit_price,
      quantity: item.quantity,
      vatRate: Number(product.vat_rate),
    });
    return {
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity: item.quantity,
      product_base_price: Number(product.price_gross),
      unit_price: item.unit_price,
      vat_rate: Number(product.vat_rate),
      ...tax,
    };
  });

  const totals = sumInvoiceTotals(lineItems);

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .insert({
      company_id: ctx.companyId,
      customer_id: input.customer_id,
      rep_id: ctx.repId,
      status: "draft",
      invoice_date: input.invoice_date,
      due_date: input.due_date ?? null,
      original_amount_gross: totals.original_amount_gross,
      original_amount_net: totals.original_amount_net,
      original_vat_amount: totals.original_vat_amount,
      current_amount_gross: totals.original_amount_gross,
    })
    .select()
    .single();

  if (invoiceError || !invoice) throw invoiceError ?? new Error("Failed to create invoice");

  const { error: itemsError } = await supabaseAdmin
    .from("invoice_items")
    .insert(lineItems.map((li) => ({ ...li, invoice_id: invoice.id })));

  if (itemsError) throw itemsError;

  return invoice;
}

export interface IssueInvoiceContext {
  companyId: string;
}

/**
 * القسم 8 + 14.1 + OD-15: إصدار الفاتورة — يثبّت رقم الفاتورة (atomic)،
 * يحدد invoice_type تلقائياً (standard/simplified) حسب توفر الرقم الضريبي للعميل،
 * ويولّد QR بصيغة ZATCA Phase 1.
 */
export async function issueInvoice(invoiceId: string, ctx: IssueInvoiceContext) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("*, customers(vat_number)")
    .eq("id", invoiceId)
    .eq("company_id", ctx.companyId)
    .single();

  if (invoiceError || !invoice) throw ApiError.notFound("الفاتورة غير موجودة");
  if (invoice.status !== "draft") {
    throw ApiError.conflict("لا يمكن إصدار فاتورة ليست في حالة Draft");
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("name, vat_number")
    .eq("id", ctx.companyId)
    .single();
  if (companyError || !company) throw ApiError.notFound("بيانات الشركة غير مكتملة");

  // OD-15: عميل بدون رقم ضريبي => تحويل تلقائي لفاتورة Simplified
  const customerVatNumber = (invoice as unknown as { customers: { vat_number: string | null } })
    .customers?.vat_number;
  const invoiceType = customerVatNumber ? "standard" : "simplified";

  const { data: sequenceNumber, error: sequenceError } = await supabaseAdmin.rpc(
    "next_document_number",
    { p_company_id: ctx.companyId, p_document_type: "invoice" },
  );
  if (sequenceError || sequenceNumber == null) {
    throw sequenceError ?? new Error("Failed to allocate invoice number");
  }

  const invoiceNumber = `INV-${String(sequenceNumber).padStart(6, "0")}`;
  const issuedAt = new Date().toISOString();

  const qrPayload = buildZatcaQrPayload({
    sellerName: company.name,
    vatNumber: company.vat_number ?? "",
    invoiceTimestamp: issuedAt,
    invoiceTotalWithVat: Number(invoice.original_amount_gross),
    vatTotal: Number(invoice.original_vat_amount),
  });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("invoices")
    .update({
      status: invoice.due_date ? "due" : "issued",
      invoice_type: invoiceType,
      invoice_number: invoiceNumber,
      qr_code_payload: qrPayload,
      issued_at: issuedAt,
    })
    .eq("id", invoiceId)
    .select()
    .single();

  if (updateError || !updated) throw updateError ?? new Error("Failed to issue invoice");

  return updated;
}

/** القسم 8: إلغاء فاتورة يُسمح به فقط إن لم يوجد دفع/مرتجع مرتبط (OD-7) */
export async function cancelInvoice(invoiceId: string, ctx: { companyId: string }) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("company_id", ctx.companyId)
    .single();
  if (invoiceError || !invoice) throw ApiError.notFound("الفاتورة غير موجودة");
  if (invoice.status === "cancelled") throw ApiError.conflict("الفاتورة ملغاة بالفعل");
  if (invoice.status === "draft") throw ApiError.conflict("استخدم حذف/تعديل Draft بدلاً من الإلغاء");

  const [{ count: paymentsCount }, { count: returnsCount }] = await Promise.all([
    supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("invoice_id", invoiceId),
    supabaseAdmin.from("returns").select("id", { count: "exact", head: true }).eq("invoice_id", invoiceId),
  ]);

  if ((paymentsCount ?? 0) > 0 || (returnsCount ?? 0) > 0) {
    throw ApiError.conflict(
      "لا يمكن إلغاء فاتورة مرتبط بها دفعة أو مرتجع — استخدم مرتجع للتصحيح (OD-7)",
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("invoices")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .select()
    .single();
  if (error || !updated) throw error ?? new Error("Failed to cancel invoice");
  return updated;
}
