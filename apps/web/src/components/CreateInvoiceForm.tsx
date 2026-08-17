"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Customer, Product, Unit } from "@banan/types";

interface DraftLine {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
}

const PAYMENT_METHODS = ["أجل", "نقدًا", "تحويل بنكي", "شيك"];

const PREDEFINED_NOTES = [
  "لا يُقبل استرجاع البضاعة بعد استلامها",
  "يُقبل استرجاع البضاعة السليمة خلال 24 ساعة من الاستلام",
  "البضاعة التالفة أو منتهية الصلاحية تُستبدل فقط ولا تُسترد قيمتها نقدًا",
  "يُرجى فحص البضاعة والتأكد من الكمية عند الاستلام",
  "الدفع مستحق خلال المدة المتفق عليها مع العميل",
];

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** القسم 22: مسار إصدار الفاتورة بأقل عدد خطوات — نموذج مشترك يُستخدم في الرئيسية وصفحة الفواتير */
export function CreateInvoiceForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [customNote, setCustomNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Customer[] }>("/customers").then((res) => setCustomers(res.data));
    apiFetch<{ data: Product[] }>("/products").then((res) => setProducts(res.data));
    apiFetch<{ data: Unit[] }>("/units").then((res) => setUnits(res.data));
  }, []);

  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name;
  const discount = Math.min(25, Math.max(0, Number(discountPercent) || 0));
  const discountedPrice = (price: number) => round2(price * (1 - discount / 100));

  function addLine() {
    if (products.length === 0) return;
    const firstProduct = products[0];
    const firstVariant = firstProduct.product_variants?.[0] ?? null;
    setLines((prev) => [
      ...prev,
      {
        product_id: firstProduct.id,
        variant_id: firstVariant?.id ?? null,
        quantity: 1,
        unit_price: Number(firstVariant?.price_gross ?? firstProduct.price_gross),
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleNote(note: string) {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(note)) next.delete(note);
      else next.add(note);
      return next;
    });
  }

  const vatRateForLine = (line: DraftLine) =>
    Number(products.find((p) => p.id === line.product_id)?.vat_rate ?? 0.15);

  let subtotalNet = 0;
  let vatTotal = 0;
  let grossTotal = 0;
  for (const line of lines) {
    const gross = line.quantity * discountedPrice(line.unit_price);
    const net = round2(gross / (1 + vatRateForLine(line)));
    const vat = round2(gross - net);
    subtotalNet += net;
    vatTotal += vat;
    grossTotal += gross;
  }
  const vatRatePercent = lines.length > 0 ? Math.round(vatRateForLine(lines[0]) * 100) : 15;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || lines.length === 0) {
      setError("اختر عميلاً وأضف منتجاً واحداً على الأقل");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const notesParts = [...PREDEFINED_NOTES.filter((n) => selectedNotes.has(n))];
      if (customNote.trim()) notesParts.push(customNote.trim());
      const notes = notesParts.length ? notesParts.join("\n") : null;

      const draft = await apiFetch<{ data: { id: string; original_amount_gross: number } }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId,
          invoice_date: new Date().toISOString().slice(0, 10),
          notes,
          items: lines.map((l) => ({
            product_id: l.product_id,
            variant_id: l.variant_id,
            quantity: l.quantity,
            unit_price: discountedPrice(l.unit_price),
          })),
        }),
      });

      await apiFetch(`/invoices/${draft.data.id}/issue`, { method: "POST" });

      if (paymentMethod !== "أجل") {
        await apiFetch("/payments", {
          method: "POST",
          body: JSON.stringify({
            invoice_id: draft.data.id,
            amount: draft.data.original_amount_gross,
            payment_date: new Date().toISOString().slice(0, 10),
            payment_method: paymentMethod,
          }),
        });
      }

      onCreated?.();
      router.push(`/invoices/${draft.data.id}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إنشاء الفاتورة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">العميل</label>
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">اختر عميلاً</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={addLine}
        disabled={products.length === 0}
        className="pill-btn border border-gray-300 text-gray-700 disabled:opacity-40"
      >
        + إضافة منتج
      </button>

      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, index) => {
            const lineTotal = line.quantity * discountedPrice(line.unit_price);
            const selectedProduct = products.find((p) => p.id === line.product_id);
            const selectedUnitName = selectedProduct ? unitName(selectedProduct.unit_id) : undefined;
            return (
              <div key={index} className="space-y-2 rounded-2xl border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={line.product_id}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      const firstVariant = product?.product_variants?.[0] ?? null;
                      updateLine(index, {
                        product_id: e.target.value,
                        variant_id: firstVariant?.id ?? null,
                        unit_price: Number(firstVariant?.price_gross ?? product?.price_gross ?? line.unit_price),
                      });
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {unitName(p.unit_id) ? ` (${unitName(p.unit_id)})` : ""}
                        {!p.product_variants?.length ? ` — ${p.price_gross} ر.س` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label="حذف المنتج"
                    className="rounded-full border border-red-200 px-3 py-2 text-red-600"
                  >
                    حذف
                  </button>
                </div>
                {(() => {
                  const selectedVariants = selectedProduct?.product_variants ?? [];
                  if (selectedVariants.length === 0) return null;
                  return (
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">الحجم</label>
                      <select
                        className="input"
                        value={line.variant_id ?? ""}
                        onChange={(e) => {
                          const variant = selectedVariants.find((v) => v.id === e.target.value);
                          updateLine(index, {
                            variant_id: e.target.value || null,
                            unit_price: variant ? Number(variant.price_gross) : line.unit_price,
                          });
                        }}
                      >
                        {selectedVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} — {v.price_gross} ر.س
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">
                      الكمية{selectedUnitName ? ` (${selectedUnitName})` : ""}
                    </label>
                    <input
                      type="number"
                      min={0.001}
                      step="0.001"
                      className="input"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">سعر الوحدة (شامل الضريبة)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="input"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <p className="text-left text-sm font-semibold text-gray-600">إجمالي السطر: {lineTotal.toFixed(2)} ر.س</p>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">طريقة الدفع</label>
        <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          نسبة الخصم المتفق عليها مع العميل (0% - 25%)
        </label>
        <input
          type="number"
          min={0}
          max={25}
          step="0.1"
          className="input"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">ملاحظات الفاتورة</label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_NOTES.map((note) => {
            const active = selectedNotes.has(note);
            return (
              <button
                key={note}
                type="button"
                onClick={() => toggleNote(note)}
                className={`chip ${active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-600"}`}
              >
                {note}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          className="input mt-2"
          placeholder="أضف ملاحظة أخرى (اختياري)..."
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
        />
      </div>

      {lines.length > 0 && (
        <div className="space-y-1 rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>المجموع قبل الضريبة</span>
            <span>{subtotalNet.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>ضريبة القيمة المضافة ({vatRatePercent}%)</span>
            <span>{vatTotal.toFixed(2)} ر.س</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-2 text-lg font-bold">
            <span>الإجمالي</span>
            <span>{grossTotal.toFixed(2)} ر.س</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="pill-btn bg-gray-900 text-white disabled:opacity-60">
        {saving ? "جارٍ الحفظ..." : "إصدار الفاتورة"}
      </button>
    </form>
  );
}
