export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  /** ISO 8601 timestamp, مثال 2026-08-11T14:30:00Z */
  invoiceTimestamp: string;
  invoiceTotalWithVat: number;
  vatTotal: number;
}

function encodeTag(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf-8");
  return Buffer.concat([Buffer.from([tag, valueBuffer.length]), valueBuffer]);
}

/**
 * القسم 14.1: QR Code بصيغة TLV (Tag-Length-Value) مُرمّز Base64.
 * Phase 1 فقط: بدون Cryptographic Stamp / Hash Chaining / CSID (خارج النطاق الحالي).
 * الحقول الخمسة الإلزامية: اسم البائع، الرقم الضريبي، التوقيت، الإجمالي شامل الضريبة، إجمالي الضريبة.
 */
export function buildZatcaQrPayload(input: ZatcaQrInput): string {
  const tlv = Buffer.concat([
    encodeTag(1, input.sellerName),
    encodeTag(2, input.vatNumber),
    encodeTag(3, input.invoiceTimestamp),
    encodeTag(4, input.invoiceTotalWithVat.toFixed(2)),
    encodeTag(5, input.vatTotal.toFixed(2)),
  ]);
  return tlv.toString("base64");
}
