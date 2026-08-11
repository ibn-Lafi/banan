import { z } from "zod";

export const bootstrapSetupSchema = z.object({
  setup_token: z.string().min(1),
  company: z.object({
    name: z.string().min(1).max(200),
    vat_number: z.string().max(50).optional().nullable(),
    cr_number: z.string().max(50).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().max(500).optional().nullable(),
  }),
  admin: z.object({
    username: z
      .string()
      .min(3)
      .max(60)
      .regex(/^[a-zA-Z0-9_.-]+$/, "أحرف/أرقام إنجليزية فقط بدون مسافات"),
    full_name: z.string().min(1).max(150),
    password: z.string().min(8).max(200),
  }),
});
export type BootstrapSetupInput = z.infer<typeof bootstrapSetupSchema>;
