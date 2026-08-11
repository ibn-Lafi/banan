import { z } from "zod";

export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string().datetime().or(z.string().date()),
  payment_method: z.string().max(60).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
