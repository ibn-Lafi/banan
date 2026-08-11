import { calculateInvoiceBalance, roundHalfUp } from "@banan/shared";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";

/**
 * القسم 11 (OD-9): الرصيد يُشتق دائماً من الحركات الفعلية (computed on-the-fly)،
 * وليس من حقل مخزَّن يُحدَّث يدوياً.
 */
export async function getInvoiceBalance(invoiceId: string) {
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, original_amount_gross")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw ApiError.notFound("الفاتورة غير موجودة");
  }

  const { data: returns, error: returnsError } = await supabaseAdmin
    .from("returns")
    .select("total_amount_gross")
    .eq("invoice_id", invoiceId);
  if (returnsError) throw returnsError;

  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  if (paymentsError) throw paymentsError;

  const totalReturns = roundHalfUp(
    (returns ?? []).reduce((sum, r) => sum + Number(r.total_amount_gross), 0),
    2,
  );
  const totalPayments = roundHalfUp(
    (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
    2,
  );

  const balance = calculateInvoiceBalance({
    originalAmountGross: Number(invoice.original_amount_gross),
    totalReturns,
    totalPaymentsAllocated: totalPayments,
  });

  return {
    invoice_id: invoiceId,
    original_amount_gross: Number(invoice.original_amount_gross),
    total_returns: totalReturns,
    total_payments: totalPayments,
    ...balance,
  };
}

/**
 * القسم 8: يعيد اشتقاق حالة الفاتورة من الرصيد الفعلي بعد أي دفعة/مرتجع.
 * لا تُطبَّق على فواتير Draft أو Cancelled.
 */
export async function recomputeInvoiceStatus(invoiceId: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("id, status, current_amount_gross, due_date")
    .eq("id", invoiceId)
    .single();
  if (error || !invoice) throw ApiError.notFound("الفاتورة غير موجودة");
  if (invoice.status === "draft" || invoice.status === "cancelled") return invoice;

  const balance = await getInvoiceBalance(invoiceId);
  const today = new Date().toISOString().slice(0, 10);

  let nextStatus: string;
  if (balance.outstanding_amount <= 0) {
    nextStatus = "paid";
  } else if (balance.total_payments > 0) {
    nextStatus = "partially_paid";
  } else if (invoice.due_date && invoice.due_date < today) {
    nextStatus = "overdue";
  } else if (invoice.due_date) {
    nextStatus = "due";
  } else {
    nextStatus = "issued";
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("invoices")
    .update({ status: nextStatus, current_amount_gross: balance.current_amount_gross })
    .eq("id", invoiceId)
    .select()
    .single();
  if (updateError || !updated) throw updateError ?? new Error("Failed to update invoice status");
  return updated;
}
