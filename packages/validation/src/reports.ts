import { z } from "zod";

export const reportFiltersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  customer_id: z.string().uuid().optional(),
  rep_id: z.string().uuid().optional(),
  status: z.string().optional(),
});
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;
