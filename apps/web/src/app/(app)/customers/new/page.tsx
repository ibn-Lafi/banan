"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { City } from "@banan/types";

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    vat_number: "",
    cr_number: "",
    phone: "",
    city_id: "",
    maps_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [showCities, setShowCities] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [cityError, setCityError] = useState<string | null>(null);
  const [savingCity, setSavingCity] = useState(false);

  function loadCities() {
    apiFetch<{ data: City[] }>("/cities").then((res) => setCities(res.data));
  }

  useEffect(loadCities, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({ ...form, city_id: form.city_id || null }),
      });
      router.replace("/customers");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ العميل");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    setSavingCity(true);
    setCityError(null);
    try {
      await apiFetch("/cities", { method: "POST", body: JSON.stringify({ name: newCityName }) });
      setNewCityName("");
      loadCities();
    } catch (err) {
      setCityError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ المدينة");
    } finally {
      setSavingCity(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">إضافة عميل</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="اسم العميل / المنشأة" required>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="الرقم الضريبي (اختياري)">
          <input
            className="input"
            value={form.vat_number}
            onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
          />
        </Field>
        <Field label="السجل التجاري (اختياري)">
          <input
            className="input"
            value={form.cr_number}
            onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
          />
        </Field>
        <Field label="رقم الجوال">
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">المدينة</label>
            <button
              type="button"
              onClick={() => setShowCities((v) => !v)}
              className="text-xs font-semibold text-brand-600"
            >
              {showCities ? "إخفاء" : "+ إضافة مدينة"}
            </button>
          </div>
          <select
            className="input"
            value={form.city_id}
            onChange={(e) => setForm({ ...form, city_id: e.target.value })}
          >
            <option value="">بدون مدينة</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {showCities && (
            <form onSubmit={handleAddCity} className="mt-2 flex gap-2">
              <input
                className="input"
                placeholder="اسم مدينة جديدة"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={savingCity}
                className="whitespace-nowrap rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-60"
              >
                إضافة
              </button>
            </form>
          )}
          {cityError && <p className="mt-1 text-sm text-red-600">{cityError}</p>}
        </div>

        <Field label="رابط الموقع (قوقل ماب)">
          <input
            className="input"
            type="url"
            dir="ltr"
            placeholder="https://maps.google.com/..."
            value={form.maps_url}
            onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ العميل"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
