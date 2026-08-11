import { Router } from "express";
import { updateCompanySettingsSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

export const companySettingsRouter = Router();
companySettingsRouter.use(requireAuth);

companySettingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", req.user!.company_id)
      .single();
    if (error) throw error;
    res.json({ data });
  }),
);

companySettingsRouter.patch(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = updateCompanySettingsSchema.parse(req.body);
    const { data: before } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", req.user!.company_id)
      .maybeSingle();
    if (!before) throw ApiError.notFound();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .update(input)
      .eq("id", req.user!.company_id)
      .select()
      .single();
    if (error) throw error;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "update_company_settings",
      entityType: "company",
      entityId: data.id,
      oldValue: before,
      newValue: data,
    });

    res.json({ data });
  }),
);
