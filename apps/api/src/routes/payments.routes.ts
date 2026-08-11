import { Router } from "express";
import { createPaymentSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { writeAuditLog } from "../services/auditService.js";
import { createPayment } from "../services/paymentService.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

// القسم 3: المندوب يرى دفعاته فقط، المدير يرى الكل
paymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    let query = supabaseAdmin
      .from("payments")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });

    if (req.user!.role !== "admin") {
      query = query.eq("created_by", req.user!.id);
    }
    if (typeof req.query.invoice_id === "string") {
      query = query.eq("invoice_id", req.query.invoice_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  }),
);

paymentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createPaymentSchema.parse(req.body);
    const payment = await createPayment(input, {
      companyId: req.user!.company_id,
      userId: req.user!.id,
      userRole: req.user!.role,
    });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_payment",
      entityType: "payment",
      entityId: payment.id,
      newValue: payment,
    });

    res.status(201).json({ data: payment });
  }),
);
