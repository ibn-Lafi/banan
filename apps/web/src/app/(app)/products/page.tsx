"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Category, Product } from "@banan/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", sku: "", price_gross: "", vat_rate: "0.15", category_id: "" });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  function loadProducts() {
    apiFetch<{ data: Product[] }>("/products").then((res) => setProducts(res.data));
  }

  function loadCategories() {
    apiFetch<{ data: Category[] }>("/categories").then((res) => setCategories(res.data));
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

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
          category_id: form.category_id || null,
        }),
      });
      setForm({ name: "", sku: "", price_gross: "", vat_rate: "0.15", category_id: "" });
      loadProducts();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ المنتج");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setSavingCategory(true);
    setCategoryError(null);
    try {
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName }),
      });
      setNewCategoryName("");
      loadCategories();
    } catch (err) {
      setCategoryError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ التصنيف");
    } finally {
      setSavingCategory(false);
    }
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">المنتجات</h1>

      <form onSubmit={handleAddCategory} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">التصنيفات</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {c.name}
            </span>
          ))}
          {categories.length === 0 && <span className="text-sm text-gray-400">لا توجد تصنيفات بعد</span>}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="اسم تصنيف جديد"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={savingCategory}
            className="whitespace-nowrap rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-60"
          >
            إضافة
          </button>
        </div>
        {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
      </form>

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
          placeholder="SKU (اختياري)"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <select
          className="input"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        >
          <option value="">بدون تصنيف</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
        {products.map((p) => {
          const meta = [p.sku, categoryName(p.category_id)].filter(Boolean).join("  •  ");
          return (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                {meta && <p className="text-xs text-gray-500">{meta}</p>}
              </div>
              <p className="font-semibold">{p.price_gross} ر.س</p>
            </li>
          );
        })}
        {products.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد منتجات</li>}
      </ul>
    </div>
  );
}
