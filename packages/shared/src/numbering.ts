import type { DocumentType } from "@banan/types";

const PREFIXES: Record<DocumentType, string> = {
  invoice: "INV",
  return: "RET",
  payment: "PAY",
};

/** القسم 15: INV-000001, RET-000001, PAY-000001 ... */
export function formatDocumentNumber(type: DocumentType, sequenceNumber: number): string {
  return `${PREFIXES[type]}-${String(sequenceNumber).padStart(6, "0")}`;
}
