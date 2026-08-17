import { z } from "zod";

// حجم/مقاس المنتج (صغير/وسط/كبير...) بسعره الخاص — القسم الجديد لدعم المنتجات
// متعددة الأحجام (مثال: بيتفور الفخامة).
export const productVariantInputSchema = z.object({
  name: z.string().min(1).max(60),
  price_gross: z.number().positive(),
});
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  category_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  price_gross: z.number().positive(),
  vat_rate: z.number().min(0).max(1),
  variants: z.array(productVariantInputSchema).max(20).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema
  .omit({ variants: true })
  .partial()
  .extend({
    status: z.enum(["active", "disabled"]).optional(),
  });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createUnitSchema = z.object({
  name: z.string().min(1).max(60),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
