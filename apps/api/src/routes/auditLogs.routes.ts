import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { supabaseAdmin } from "../lib/supabase.js";

export const auditLogsRouter = Router();
auditLogsRouter.use(requireAuth, requireRole("admin"));

auditLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.page_size ?? 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeof req.query.entity_type === "string") {
      query = query.eq("entity_type", req.query.entity_type);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, total: count ?? 0, page, page_size: pageSize });
  }),
);
