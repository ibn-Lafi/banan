import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  category_id: z.string().uuid().optional().nullable(),
  price_gross: z.number().positive(),
  vat_rate: z.number().min(0).max(1),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(["active", "disabled"]).optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
