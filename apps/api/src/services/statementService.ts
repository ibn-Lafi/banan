import { roundHalfUp } from "@banan/shared";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";

export interface StatementFilters {
  from?: string;
  to?: string;
}

interface LedgerRow {
  type: "invoice" | "return" | "payment";
  date: string;
  reference_id: string;
  reference_number: string;
  amount: number;
}

/**
 * القسم 12 (OD-9): كشف حساب العميل — محسوب لحظياً (computed on-the-fly)
 * من الحركات الفعلية: فواتير (+)، مرتجعات (-)، دفعات (-).
 */
export async function getCustomerStatement(customerId: string, companyId: string, filters: StatementFilters) {
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw ApiError.notFound("العميل غير موجود");

  const [invoicesRes, returnsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, invoice_date, original_amount_gross, status")
      .eq("customer_id", customerId)
      .eq("company_id", companyId)
      .neq("status", "draft")
      .neq("status", "cancelled"),
    supabaseAdmin
      .from("returns")
      .select("id, return_number, return_date, total_amount_gross, invoices!inner(customer_id)")
      .eq("invoices.customer_id", customerId)
      .eq("company_id", companyId),
    supabaseAdmin
      .from("payments")
      .select("id, payment_number, payment_date, amount")
      .eq("customer_id", customerId)
      .eq("company_id", companyId),
  ]);

  if (invoicesRes.error) throw invoicesRes.error;
  if (returnsRes.error) throw returnsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  let entries: LedgerRow[] = [
    ...(invoicesRes.data ?? []).map((i) => ({
      type: "invoice" as const,
      date: i.invoice_date,
      reference_id: i.id,
      reference_number: i.invoice_number ?? "",
      amount: Number(i.original_amount_gross),
    })),
    ...(returnsRes.data ?? []).map((r) => ({
      type: "return" as const,
      date: r.return_date,
      reference_id: r.id,
      reference_number: r.return_number ?? "",
      amount: -Number(r.total_amount_gross),
    })),
    ...(paymentsRes.data ?? []).map((p) => ({
      type: "payment" as const,
      date: p.payment_date,
      reference_id: p.id,
      reference_number: p.payment_number ?? "",
      amount: -Number(p.amount),
    })),
  ];

  if (filters.from) entries = entries.filter((e) => e.date >= filters.from!);
  if (filters.to) entries = entries.filter((e) => e.date <= filters.to!);

  entries.sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = 0;
  const ledger = entries.map((entry) => {
    runningBalance = roundHalfUp(runningBalance + entry.amount, 2);
    return { ...entry, running_balance: runningBalance };
  });

  const totalInvoices = roundHalfUp(
    entries.filter((e) => e.type === "invoice").reduce((s, e) => s + e.amount, 0),
    2,
  );
  const totalReturns = roundHalfUp(
    -entries.filter((e) => e.type === "return").reduce((s, e) => s + e.amount, 0),
    2,
  );
  const totalPayments = roundHalfUp(
    -entries.filter((e) => e.type === "payment").reduce((s, e) => s + e.amount, 0),
    2,
  );

  return {
    customer_id: customerId,
    current_balance: runningBalance,
    total_invoices: totalInvoices,
    total_returns: totalReturns,
    total_payments: totalPayments,
    outstanding_amount: runningBalance,
    entries: ledger,
  };
}
