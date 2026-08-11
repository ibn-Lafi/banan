"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Product } from "@banan/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", sku: "", price_gross: "", vat_rate: "0.15" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ data: Product[] }>("/products").then((res) => setProducts(res.data));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          price_gross: Number(form.price_gross),
          vat_rate: Number(form.vat_rate),
        }),
      });
      setForm({ name: "", sku: "", price_gross: "", vat_rate: "0.15" });
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ المنتج");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">المنتجات</h1>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">إضافة منتج</p>
        <input
          className="input"
          placeholder="اسم المنتج"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="السعر شامل الضريبة"
            value={form.price_gross}
            onChange={(e) => setForm({ ...form, price_gross: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="نسبة الضريبة (0.15)"
            value={form.vat_rate}
            onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "إضافة"}
        </button>
      </form>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-gray-500">{p.sku}</p>
            </div>
            <p className="font-semibold">{p.price_gross} ر.س</p>
          </li>
        ))}
        {products.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد منتجات</li>}
      </ul>
    </div>
  );
}
