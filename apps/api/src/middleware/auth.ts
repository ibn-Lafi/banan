import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { asyncHandler } from "./asyncHandler.js";

/**
 * القسم 20: كل Authorization يتم في Backend اعتماداً على الـ session/token،
 * وليس على ما يُرسله الـ Frontend. نتحقق من JWT عبر Supabase Auth، ثم نجلب
 * صف public.users المرتبط لمعرفة company_id/role/status الفعليين.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    throw ApiError.unauthorized();
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    throw ApiError.unauthorized();
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, company_id, username, full_name, role, status")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    throw ApiError.unauthorized();
  }
  if (profile.status !== "active") {
    throw ApiError.forbidden("تم تعطيل هذا الحساب");
  }

  req.user = profile;
  next();
});
