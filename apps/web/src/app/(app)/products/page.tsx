"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Category, Product, Unit } from "@banan/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price_gross: "",
    vat_rate: "0.15",
    category_id: "",
    unit_id: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCategories, setShowCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [showUnits, setShowUnits] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [unitError, setUnitError] = useState<string | null>(null);
  const [savingUnit, setSavingUnit] = useState(false);

  function loadProducts() {
    apiFetch<{ data: Product[] }>("/products")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }

  function loadCategories() {
    apiFetch<{ data: Category[] }>("/categories").then((res) => setCategories(res.data));
  }

  function loadUnits() {
    apiFetch<{ data: Unit[] }>("/units").then((res) => setUnits(res.data));
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadUnits();
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
          unit_id: form.unit_id || null,
        }),
      });
      setForm({ name: "", sku: "", price_gross: "", vat_rate: "0.15", category_id: "", unit_id: "" });
      setShowCreate(false);
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

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    setSavingUnit(true);
    setUnitError(null);
    try {
      await apiFetch("/units", {
        method: "POST",
        body: JSON.stringify({ name: newUnitName }),
      });
      setNewUnitName("");
      loadUnits();
    } catch (err) {
      setUnitError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ الوحدة");
    } finally {
      setSavingUnit(false);
    }
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name;

  const filtered = useMemo(
    () => (filterCategory === "all" ? products : products.filter((p) => p.category_id === filterCategory)),
    [products, filterCategory],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المنتجات</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? "إخفاء النموذج" : "+ منتج جديد"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
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
          <div className="flex gap-2">
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
            <select
              className="input"
              value={form.unit_id}
              onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
            >
              <option value="">بدون وحدة</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">السعر شامل الضريبة</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                className="input"
                value={form.price_gross}
                onChange={(e) => setForm({ ...form, price_gross: e.target.value })}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">نسبة الضريبة</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                className="input"
                value={form.vat_rate}
                onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "إضافة"}
          </button>
        </form>
      )}

      <div className="flex gap-4">
        <button onClick={() => setShowCategories((v) => !v)} className="text-sm font-semibold text-brand-600">
          {showCategories ? "إخفاء التصنيفات" : "إدارة التصنيفات"}
        </button>
        <button onClick={() => setShowUnits((v) => !v)} className="text-sm font-semibold text-brand-600">
          {showUnits ? "إخفاء الوحدات" : "إدارة الوحدات"}
        </button>
      </div>

      {showCategories && (
        <form onSubmit={handleAddCategory} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
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
      )}

      {showUnits && (
        <form onSubmit={handleAddUnit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {units.map((u) => (
              <span key={u.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {u.name}
              </span>
            ))}
            {units.length === 0 && <span className="text-sm text-gray-400">لا توجد وحدات بعد</span>}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="اسم وحدة جديدة (بوكس، علبة...)"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={savingUnit}
              className="whitespace-nowrap rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-60"
            >
              إضافة
            </button>
          </div>
          {unitError && <p className="text-sm text-red-600">{unitError}</p>}
        </form>
      )}

      {categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setFilterCategory("all")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterCategory === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filterCategory === c.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">لا توجد منتجات</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filtered.map((p) => {
            const meta = [p.sku, categoryName(p.category_id), unitName(p.unit_id)].filter(Boolean).join("  •  ");
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
        </ul>
      )}
    </div>
  );
}
