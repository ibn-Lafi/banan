import { Router } from "express";
import { createCitySchema, createCustomerSchema, updateCustomerSchema } from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";
import { getCustomerStatement } from "../services/statementService.js";

export const customersRouter = Router();
customersRouter.use(requireAuth);

// القسم 5: العميل كيان مركزي مشترك بين كل المناديب — الجميع يرى الكل
customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    let query = supabaseAdmin
      .from("customers")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,vat_number.ilike.%${search}%,cr_number.ilike.%${search}%`,
      );
    }
    if (typeof req.query.city_id === "string") {
      query = query.eq("city_id", req.query.city_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  }),
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw ApiError.notFound();
    res.json({ data });
  }),
);

customersRouter.get(
  "/:id/statement",
  asyncHandler(async (req, res) => {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const statement = await getCustomerStatement(req.params.id, req.user!.company_id, { from, to });
    res.json({ data: statement });
  }),
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCustomerSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert({ ...input, company_id: req.user!.company_id, created_by: req.user!.id })
      .select()
      .single();
    if (error) throw error;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_customer",
      entityType: "customer",
      entityId: data.id,
      newValue: data,
    });

    res.status(201).json({ data });
  }),
);

// OD-4: كل المناديب يعدّلون بيانات العميل (كيان مشترك)، لكن تعطيل/تفعيل العميل لـ Admin فقط
customersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateCustomerSchema.parse(req.body);
    if (input.status !== undefined && req.user!.role !== "admin") {
      throw ApiError.forbidden("تغيير حالة العميل متاح للمدير فقط");
    }

    const { data: before } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (!before) throw ApiError.notFound();

    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(input)
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .select()
      .single();
    if (error) throw error;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "update_customer",
      entityType: "customer",
      entityId: data.id,
      oldValue: before,
      newValue: data,
    });

    res.json({ data });
  }),
);

export const citiesRouter = Router();
citiesRouter.use(requireAuth);

citiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("cities")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("name");
    if (error) throw error;
    res.json({ data });
  }),
);

// كيان تنظيمي مشترك مثل التصنيفات والوحدات — أي مستخدم مسجّل دخوله يقدر يضيف مدينة
citiesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCitySchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("cities")
      .insert({ ...input, company_id: req.user!.company_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  }),
);
