import { z } from "zod";

export const returnItemInputSchema = z.object({
  invoice_item_id: z.string().uuid(),
  returned_quantity: z.number().positive(),
  condition: z.enum(["sound", "damaged"]).optional().nullable(),
});
export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;

export const createReturnSchema = z.object({
  invoice_id: z.string().uuid(),
  return_date: z.string().datetime().or(z.string().date()),
  items: z.array(returnItemInputSchema).min(1),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
