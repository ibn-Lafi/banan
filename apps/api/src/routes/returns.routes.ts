import { Router } from "express";
import { createReturnSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { writeAuditLog } from "../services/auditService.js";
import { createReturn } from "../services/returnService.js";

export const returnsRouter = Router();
returnsRouter.use(requireAuth);

returnsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    let query = supabaseAdmin
      .from("returns")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });

    if (req.user!.role !== "admin") {
      query = query.eq("rep_id", req.user!.id);
    }
    if (typeof req.query.invoice_id === "string") {
      query = query.eq("invoice_id", req.query.invoice_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  }),
);

returnsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createReturnSchema.parse(req.body);
    const createdReturn = await createReturn(input, {
      companyId: req.user!.company_id,
      userId: req.user!.id,
      userRole: req.user!.role,
    });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_return",
      entityType: "return",
      entityId: createdReturn.id,
      newValue: createdReturn,
    });

    res.status(201).json({ data: createdReturn });
  }),
);
