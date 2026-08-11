import { Router } from "express";
import { reportFiltersSchema } from "@banan/validation";
import { roundHalfUp } from "@banan/shared";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// القسم 13: المندوب يرى تقاريره فقط، المدير يرى الكل
reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = reportFiltersSchema.parse(req.query);

    let invoicesQuery = supabaseAdmin
      .from("invoices")
      .select("id, status, original_amount_gross, current_amount_gross, invoice_date, rep_id, customer_id")
      .eq("company_id", req.user!.company_id);

    if (req.user!.role !== "admin") invoicesQuery = invoicesQuery.eq("rep_id", req.user!.id);
    if (filters.from) invoicesQuery = invoicesQuery.gte("invoice_date", filters.from);
    if (filters.to) invoicesQuery = invoicesQuery.lte("invoice_date", filters.to);
    if (filters.customer_id) invoicesQuery = invoicesQuery.eq("customer_id", filters.customer_id);
    if (filters.rep_id && req.user!.role === "admin") invoicesQuery = invoicesQuery.eq("rep_id", filters.rep_id);
    if (filters.status) invoicesQuery = invoicesQuery.eq("status", filters.status);

    const { data: invoices, error: invoicesError } = await invoicesQuery;
    if (invoicesError) throw invoicesError;

    const invoiceIds = (invoices ?? []).map((i) => i.id);

    const [returnsRes, paymentsRes] = await Promise.all([
      invoiceIds.length
        ? supabaseAdmin.from("returns").select("id, total_amount_gross, invoice_id").in("invoice_id", invoiceIds)
        : Promise.resolve({ data: [], error: null }),
      invoiceIds.length
        ? supabaseAdmin.from("payments").select("id, amount, invoice_id").in("invoice_id", invoiceIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (returnsRes.error) throw returnsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const totalSales = roundHalfUp(
      (invoices ?? []).reduce((s, i) => s + Number(i.original_amount_gross), 0),
      2,
    );
    const totalReturns = roundHalfUp(
      (returnsRes.data ?? []).reduce((s, r) => s + Number(r.total_amount_gross), 0),
      2,
    );
    const totalPayments = roundHalfUp(
      (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
      2,
    );
    const totalOutstanding = roundHalfUp(
      (invoices ?? []).reduce((s, i) => s + Number(i.current_amount_gross), 0) - totalPayments,
      2,
    );

    res.json({
      data: {
        invoices_count: invoices?.length ?? 0,
        returns_count: returnsRes.data?.length ?? 0,
        payments_count: paymentsRes.data?.length ?? 0,
        total_sales: totalSales,
        total_returns: totalReturns,
        total_payments: totalPayments,
        total_outstanding: totalOutstanding,
      },
    });
  }),
);
