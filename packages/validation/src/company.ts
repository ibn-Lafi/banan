import { z } from "zod";

export const updateCompanySettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vat_number: z.string().max(50).optional().nullable(),
  cr_number: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
