/**
 * Round Half Up إلى عدد خانات عشرية محدد (افتراضي 2) — القرار المعتمد في OD-6.
 * نتجنب أخطاء الفاصلة العائمة الشائعة (مثل 1.005 -> 1.00 في Math.round المباشر)
 * بإضافة Number.EPSILON قبل التقريب.
 */
export function roundHalfUp(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
