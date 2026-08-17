import { Router } from "express";
import {
  createCategorySchema,
  createProductSchema,
  createUnitSchema,
  productVariantInputSchema,
  updateProductSchema,
} from "@banan/validation";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ApiError } from "../lib/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    let query = supabaseAdmin
      .from("products")
      .select("*, product_variants(*)")
      .eq("company_id", req.user!.company_id)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  }),
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw ApiError.notFound();
    res.json({ data });
  }),
);

// OD-4: كل المناديب يضيفون/يعدّلون منتجات (كيان مشترك)
productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { variants, ...input } = createProductSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({ ...input, company_id: req.user!.company_id, created_by: req.user!.id })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw ApiError.conflict("رمز SKU مستخدم بالفعل");
      throw error;
    }

    let createdVariants: unknown[] = [];
    if (variants && variants.length > 0) {
      const { data: variantRows, error: variantsError } = await supabaseAdmin
        .from("product_variants")
        .insert(variants.map((v) => ({ ...v, product_id: data.id })))
        .select();
      if (variantsError) throw variantsError;
      createdVariants = variantRows ?? [];
    }

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: "create_product",
      entityType: "product",
      entityId: data.id,
      newValue: data,
    });

    res.status(201).json({ data: { ...data, product_variants: createdVariants } });
  }),
);

// إضافة حجم/مقاس جديد لمنتج موجود (بدون التأثير على الأحجام الأخرى)
productsRouter.post(
  "/:id/variants",
  asyncHandler(async (req, res) => {
    const input = productVariantInputSchema.parse(req.body);
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (!product) throw ApiError.notFound("المنتج غير موجود");

    const { data, error } = await supabaseAdmin
      .from("product_variants")
      .insert({ ...input, product_id: product.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  }),
);

productsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateProductSchema.parse(req.body);
    if (input.status !== undefined && req.user!.role !== "admin") {
      throw ApiError.forbidden("تغيير حالة المنتج متاح للمدير فقط");
    }

    const { data: before } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .maybeSingle();
    if (!before) throw ApiError.notFound();

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(input)
      .eq("id", req.params.id)
      .eq("company_id", req.user!.company_id)
      .select()
      .single();
    if (error) throw error;

    const priceChanged = input.price_gross !== undefined && Number(before.price_gross) !== input.price_gross;

    await writeAuditLog({
      companyId: req.user!.company_id,
      userId: req.user!.id,
      action: priceChanged ? "update_product_price" : "update_product",
      entityType: "product",
      entityId: data.id,
      oldValue: before,
      newValue: data,
    });

    res.json({ data });
  }),
);

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("name");
    if (error) throw error;
    res.json({ data });
  }),
);

// كيان تنظيمي مشترك مثل العملاء والمنتجات — أي مستخدم مسجّل دخوله يقدر يضيف تصنيف
categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({ ...input, company_id: req.user!.company_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  }),
);

export const unitsRouter = Router();
unitsRouter.use(requireAuth);

unitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("units")
      .select("*")
      .eq("company_id", req.user!.company_id)
      .order("name");
    if (error) throw error;
    res.json({ data });
  }),
);

// وحدة قياس المنتج (بوكس / علبة ...) — كيان تنظيمي مشترك بنفس نمط التصنيفات
unitsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createUnitSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("units")
      .insert({ ...input, company_id: req.user!.company_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  }),
);
