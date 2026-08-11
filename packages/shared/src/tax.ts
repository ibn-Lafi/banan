import { roundHalfUp } from "./rounding.js";

export interface LineTaxInput {
  /** السعر النهائي شامل الضريبة للوحدة (Gross/Tax-Inclusive) */
  unitPriceGross: number;
  quantity: number;
  /** نسبة الضريبة كعدد عشري، مثال 0.15 لـ 15% */
  vatRate: number;
}

export interface LineTaxResult {
  line_gross: number;
  line_net: number;
  line_vat: number;
}

/**
 * القسم 7 من SPEC.md: كل الأسعار المُدخلة شاملة للضريبة (Gross).
 * Net = Gross / (1 + VAT Rate)
 * VAT = Gross - Net
 * التقريب Round Half Up على مستوى البند (line item) — QD-6.
 * نحسب line_net أولاً بالتقريب، ثم line_vat = line_gross - line_net
 * لضمان أن net + vat = gross دائماً بدون فروقات هللة.
 */
export function calculateLineTax({ unitPriceGross, quantity, vatRate }: LineTaxInput): LineTaxResult {
  const lineGross = roundHalfUp(unitPriceGross * quantity, 2);
  const lineNet = roundHalfUp(lineGross / (1 + vatRate), 2);
  const lineVat = roundHalfUp(lineGross - lineNet, 2);
  return { line_gross: lineGross, line_net: lineNet, line_vat: lineVat };
}

export interface InvoiceTotals {
  original_amount_gross: number;
  original_amount_net: number;
  original_vat_amount: number;
}

/**
 * إجمالي الفاتورة = مجموع البنود بعد تقريب كل بند على حدة (لتفادي فروقات تراكمية)،
 * وليس تقريب الإجمالي مباشرة.
 */
export function sumInvoiceTotals(lines: LineTaxResult[]): InvoiceTotals {
  const original_amount_gross = roundHalfUp(
    lines.reduce((sum, l) => sum + l.line_gross, 0),
    2,
  );
  const original_amount_net = roundHalfUp(
    lines.reduce((sum, l) => sum + l.line_net, 0),
    2,
  );
  const original_vat_amount = roundHalfUp(
    lines.reduce((sum, l) => sum + l.line_vat, 0),
    2,
  );
  return { original_amount_gross, original_amount_net, original_vat_amount };
}
