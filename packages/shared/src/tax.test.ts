import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLineTax, sumInvoiceTotals } from "./tax.js";
import { calculateInvoiceBalance } from "./balance.js";

test("calculateLineTax: gross=18 vat=15% matches SPEC.md example", () => {
  const result = calculateLineTax({ unitPriceGross: 18, quantity: 1, vatRate: 0.15 });
  assert.equal(result.line_gross, 18);
  assert.equal(result.line_net, 15.65);
  assert.equal(result.line_vat, 2.35);
  assert.equal(
    Math.round((result.line_net + result.line_vat) * 100) / 100,
    result.line_gross,
  );
});

test("sumInvoiceTotals: sums rounded line totals without drift", () => {
  const lines = [
    calculateLineTax({ unitPriceGross: 18, quantity: 10, vatRate: 0.15 }), // كيك x10 = 180
  ];
  const totals = sumInvoiceTotals(lines);
  assert.equal(totals.original_amount_gross, 180);
});

test("calculateInvoiceBalance: Invoice 1000 -> Return 200 -> Current 800", () => {
  const balance = calculateInvoiceBalance({
    originalAmountGross: 1000,
    totalReturns: 200,
    totalPaymentsAllocated: 0,
  });
  assert.equal(balance.current_amount_gross, 800);
  assert.equal(balance.outstanding_amount, 800);
});

test("calculateInvoiceBalance: Invoice 1000 -> Payment 300 -> Return 200 -> Outstanding 500", () => {
  const balance = calculateInvoiceBalance({
    originalAmountGross: 1000,
    totalReturns: 200,
    totalPaymentsAllocated: 300,
  });
  assert.equal(balance.current_amount_gross, 800);
  assert.equal(balance.outstanding_amount, 500);
});
