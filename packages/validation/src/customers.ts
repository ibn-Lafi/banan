import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null));

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  vat_number: optionalText(50),
  cr_number: optionalText(50),
  phone: optionalText(30),
  email: optionalText(200),
  city_id: z.string().uuid().optional().nullable(),
  maps_url: optionalText(500),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  status: z.enum(["active", "suspended"]).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createCitySchema = z.object({
  name: z.string().min(1).max(120),
});
export type CreateCityInput = z.infer<typeof createCitySchema>;
