import { z } from "zod";

export const invoiceItemInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  // القسم 7: المندوب يستطيع تعديل unit_price بحرية، لا حد أدنى في MVP
  unit_price: z.number().positive(),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const createInvoiceDraftSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_date: z.string().datetime().or(z.string().date()),
  due_date: z.string().datetime().or(z.string().date()).optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1),
});
export type CreateInvoiceDraftInput = z.infer<typeof createInvoiceDraftSchema>;

export const updateInvoiceDraftSchema = createInvoiceDraftSchema.partial();
export type UpdateInvoiceDraftInput = z.infer<typeof updateInvoiceDraftSchema>;

// إصدار الفاتورة لا يحتاج body إضافي، كل شيء محسوب في Backend من الـ Draft المحفوظ
export const issueInvoiceSchema = z.object({}).optional();
