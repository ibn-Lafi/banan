import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  vat_number: z.string().trim().min(1).max(50).optional().nullable(),
  cr_number: z.string().trim().max(50).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  status: z.enum(["active", "suspended"]).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
