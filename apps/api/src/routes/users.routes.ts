import { Router } from "express";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";
import { createUserAccount } from "../services/authService.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("admin"));

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, company_id, username, full_name, role, status, created_at, updated_at")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ data });
  }),
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const created = await createUserAccount({
      companyId: req.user!.company_id,
      username: input.username,
      fullName: input.full_name,
      password: input.password,
      role: input.role,
    });

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_user",
      entityType: "user",
      entityId: created.id,
      newValue: { ...created, password: undefined },
    });

    res.status(201).json({ data: created });
  }),
);

// حذف المستخدم فعلياً غير مسموح (Pre-Implementation Review #9) — تعطيل فقط عبر PATCH status
usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);

    const { data: before } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (!before) throw ApiError.notFound();

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(input)
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .select("id, company_id, username, full_name, role, status, created_at, updated_at")
      .single();
    if (error) throw error;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: input.status === "disabled" ? "disable_user" : "update_user",
      entityType: "user",
      entityId: data.id,
      oldValue: before,
      newValue: data,
    });

    res.json({ data });
  }),
);

usersRouter.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const { data: target } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (!target) throw ApiError.notFound();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
      password: input.new_password,
    });
    if (error) throw error;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "update_user",
      entityType: "user",
      entityId: target.id,
      metadata: { reset_password: true },
    });

    res.status(204).send();
  }),
);
