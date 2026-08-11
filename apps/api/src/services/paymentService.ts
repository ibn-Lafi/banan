import { roundHalfUp } from "@banan/shared";
import type { CreatePaymentInput } from "@banan/validation";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { getInvoiceBalance, recomputeInvoiceStatus } from "./balanceService.js";

export interface CreatePaymentContext {
  companyId: string;
  userId: string;
  userRole: "admin" | "rep";
}

/**
 * القسم 9 + OD-8: يُمنع تسجيل دفعة تجعل إجمالي المدفوعات يتجاوز Outstanding Amount.
 * المندوب لا يستطيع تسجيل دفعة إلا لفواتيره هو (القسم 3).
 */
export async function createPayment(input: CreatePaymentInput, ctx: CreatePaymentContext) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, company_id, customer_id, rep_id, status")
    .eq("id", input.invoice_id)
    .eq("company_id", ctx.companyId)
    .single();

  if (invoiceError || !invoice) throw ApiError.notFound("الفاتورة غير موجودة");
  if (ctx.userRole === "rep" && invoice.rep_id !== ctx.userId) {
    throw ApiError.forbidden("لا يمكنك تسجيل دفعة لفاتورة ليست لك");
  }
  if (invoice.status === "draft" || invoice.status === "cancelled") {
    throw ApiError.conflict("لا يمكن تسجيل دفعة على فاتورة Draft أو ملغاة");
  }

  const balance = await getInvoiceBalance(invoice.id);
  const amount = roundHalfUp(input.amount, 2);
  // هامش صغير (نصف هللة) لتفادي رفض دفعة تساوي المتبقي تماماً بسبب فروقات
  // الفاصلة العائمة عند حساب outstanding_amount من عدة عمليات جمع/طرح متتالية.
  if (amount > balance.outstanding_amount + 0.005) {
    throw ApiError.badRequest(
      `مبلغ الدفعة (${amount}) يتجاوز المبلغ المتبقي (${balance.outstanding_amount}) — OD-8`,
    );
  }

  const { data: sequenceNumber, error: sequenceError } = await supabaseAdmin.rpc(
    "next_document_number",
    { p_company_id: ctx.companyId, p_document_type: "payment" },
  );
  if (sequenceError || sequenceNumber == null) throw sequenceError ?? new Error("Failed to allocate payment number");

  const paymentNumber = `PAY-${String(sequenceNumber).padStart(6, "0")}`;

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .insert({
      company_id: ctx.companyId,
      payment_number: paymentNumber,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error || !payment) throw error ?? new Error("Failed to create payment");

  await recomputeInvoiceStatus(invoice.id);

  return payment;
}
