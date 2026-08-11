import { roundHalfUp } from "./rounding.js";

export interface BalanceInput {
  originalAmountGross: number;
  totalReturns: number;
  totalPaymentsAllocated: number;
}

export interface BalanceResult {
  current_amount_gross: number;
  outstanding_amount: number;
}

/**
 * القسم 11: Balance Logic
 * Current Invoice Amount = Original Invoice Amount − Total Returns
 * Outstanding Amount     = Current Invoice Amount − Payments Allocated
 * يُشتق دائماً من الحركات الفعلية (فواتير + مرتجعات + دفعات)، وليس من حقل مخزَّن يدوياً (OD-9).
 */
export function calculateInvoiceBalance({
  originalAmountGross,
  totalReturns,
  totalPaymentsAllocated,
}: BalanceInput): BalanceResult {
  const current_amount_gross = roundHalfUp(originalAmountGross - totalReturns, 2);
  const outstanding_amount = roundHalfUp(current_amount_gross - totalPaymentsAllocated, 2);
  return { current_amount_gross, outstanding_amount };
}
