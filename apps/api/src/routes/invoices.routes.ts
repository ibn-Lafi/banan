import { Router } from "express";
import { createInvoiceDraftSchema, updateInvoiceDraftSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";
import { cancelInvoice, createInvoiceDraft, getInvoicePdf, issueInvoice } from "../services/invoiceService.js";
import { getInvoiceBalance } from "../services/balanceService.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

// القسم 3: المندوب يرى فواتيره فقط، المدير يرى الكل
invoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    let query = supabaseAdmin
      .from("invoices")
      .select("*, customers(name)")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });

    if (req.user!.role !== "admin") {
      query = query.eq("rep_id", req.user!.id);
    }
    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }
    if (typeof req.query.customer_id === "string") {
      query = query.eq("customer_id", req.query.customer_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  }),
);

async function loadInvoiceOr404(id: string, companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*, customers(*), invoice_items(*)")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound("الفاتورة غير موجودة");
  return data;
}

function assertInvoiceAccess(invoice: { rep_id: string }, req: import("express").Request) {
  if (req.user!.role !== "admin" && invoice.rep_id !== req.user!.id) {
    throw ApiError.forbidden("لا يمكنك الوصول لفاتورة ليست لك");
  }
}

invoicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoiceOr404(req.params.id, req.user!.company_id);
    assertInvoiceAccess(invoice, req);
    const balance = await getInvoiceBalance(invoice.id);
    res.json({ data: { ...invoice, balance } });
  }),
);

invoicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createInvoiceDraftSchema.parse(req.body);
    const invoice = await createInvoiceDraft(input, {
      companyId: req.user!.company_id,
      repId: req.user!.id,
    });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_invoice_draft",
      entityType: "invoice",
      entityId: invoice.id,
      newValue: invoice,
    });

    res.status(201).json({ data: invoice });
  }),
);

invoicesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoiceOr404(req.params.id, req.user!.company_id);
    assertInvoiceAccess(invoice, req);
    if (invoice.status !== "draft") {
      throw ApiError.conflict("لا يمكن تعديل فاتورة صادرة — القسم 8");
    }

    const input = updateInvoiceDraftSchema.parse(req.body);

    // إعادة إنشاء الفاتورة كـ Draft جديد أبسط وأكثر أماناً من تعديل جزئي معقد للبنود
    await supabaseAdmin.from("invoice_items").delete().eq("invoice_id", invoice.id);
    await supabaseAdmin.from("invoices").delete().eq("id", invoice.id);

    const recreated = await createInvoiceDraft(
      {
        customer_id: input.customer_id ?? invoice.customer_id,
        invoice_date: input.invoice_date ?? invoice.invoice_date,
        due_date: input.due_date ?? invoice.due_date,
        items:
          input.items ??
          invoice.invoice_items.map((it: { product_id: string; quantity: number; unit_price: number }) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
          })),
      },
      { companyId: req.user!.company_id, repId: req.user!.id },
    );

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "update_invoice_draft",
      entityType: "invoice",
      entityId: recreated.id,
      oldValue: invoice,
      newValue: recreated,
    });

    res.json({ data: recreated });
  }),
);

invoicesRouter.post(
  "/:id/issue",
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoiceOr404(req.params.id, req.user!.company_id);
    assertInvoiceAccess(invoice, req);
    const issued = await issueInvoice(invoice.id, { companyId: req.user!.company_id });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "issue_invoice",
      entityType: "invoice",
      entityId: issued.id,
      oldValue: { status: "draft" },
      newValue: issued,
    });

    res.json({ data: issued });
  }),
);

invoicesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoiceOr404(req.params.id, req.user!.company_id);
    assertInvoiceAccess(invoice, req);
    const cancelled = await cancelInvoice(invoice.id, { companyId: req.user!.company_id });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "cancel_invoice",
      entityType: "invoice",
      entityId: cancelled.id,
      oldValue: { status: invoice.status },
      newValue: cancelled,
    });

    res.json({ data: cancelled });
  }),
);

invoicesRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const invoice = await loadInvoiceOr404(req.params.id, req.user!.company_id);
    assertInvoiceAccess(invoice, req);
    if (invoice.status === "draft") {
      throw ApiError.conflict("يجب إصدار الفاتورة أولاً قبل توليد PDF");
    }
    const pdfBuffer = await getInvoicePdf(invoice.id, { companyId: req.user!.company_id });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoice.invoice_number ?? invoice.id}.pdf"`,
    );
    res.send(pdfBuffer);
  }),
);
