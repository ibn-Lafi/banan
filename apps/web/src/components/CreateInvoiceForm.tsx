"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Customer, Product, Unit } from "@banan/types";

interface DraftLine {
  product_id: string;
  quantity: number;
  unit_price: number;
}

/** القسم 22: مسار إصدار الفاتورة بأقل عدد خطوات — نموذج مشترك يُستخدم في الرئيسية وصفحة الفواتير */
export function CreateInvoiceForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Customer[] }>("/customers").then((res) => setCustomers(res.data));
    apiFetch<{ data: Product[] }>("/products").then((res) => setProducts(res.data));
    apiFetch<{ data: Unit[] }>("/units").then((res) => setUnits(res.data));
  }, []);

  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name;

  function addLine() {
    if (products.length === 0) return;
    const firstProduct = products[0];
    setLines((prev) => [
      ...prev,
      { product_id: firstProduct.id, quantity: 1, unit_price: Number(firstProduct.price_gross) },
    ]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || lines.length === 0) {
      setError("اختر عميلاً وأضف منتجاً واحداً على الأقل");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: { id: string } }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId,
          invoice_date: new Date().toISOString().slice(0, 10),
          items: lines,
        }),
      });
      onCreated?.();
      router.push(`/invoices/${res.data.id}`);
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">المنتجات</label>
          <button
            type="button"
            onClick={addLine}
            disabled={products.length === 0}
            className="text-sm font-semibold text-brand-600 disabled:opacity-40"
          >
            + إضافة منتج
          </button>
        </div>

        {lines.map((line, index) => {
          const lineTotal = line.quantity * line.unit_price;
          const selectedProduct = products.find((p) => p.id === line.product_id);
          const selectedUnitName = selectedProduct ? unitName(selectedProduct.unit_id) : undefined;
          return (
            <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={line.product_id}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    updateLine(index, {
                      product_id: e.target.value,
                      unit_price: product ? Number(product.price_gross) : line.unit_price,
                    });
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {unitName(p.unit_id) ? ` (${unitName(p.unit_id)})` : ""} — {p.price_gross} ر.س
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  aria-label="حذف المنتج"
                  className="rounded-lg border border-red-200 px-3 py-2 text-red-600"
                >
                  حذف
                </button>
              </div>
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
        {lines.length === 0 && (
          <p className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
            لا توجد منتجات في الفاتورة بعد — اضغط «+ إضافة منتج»
          </p>
        )}
      </div>

      <div className="rounded-lg bg-gray-100 px-4 py-3 text-lg font-bold">
        الإجمالي التقديري: {total.toFixed(2)} ر.س
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : "متابعة للمراجعة"}
      </button>
    </form>
  );
}
