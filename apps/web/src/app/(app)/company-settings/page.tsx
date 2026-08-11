"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Company } from "@banan/types";

export default function CompanySettingsPage() {
  const [form, setForm] = useState<Partial<Company>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Company }>("/company-settings").then((res) => setForm(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/company-settings", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          vat_number: form.vat_number,
          cr_number: form.cr_number,
          phone: form.phone,
          email: form.email,
          address: form.address,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">إعدادات الشركة</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="input"
          placeholder="الاسم التجاري"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="الرقم الضريبي"
          value={form.vat_number ?? ""}
          onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
        />
        <input
          className="input"
          placeholder="السجل التجاري"
          value={form.cr_number ?? ""}
          onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
        />
        <input
          className="input"
          placeholder="رقم الجوال"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="input"
          placeholder="البريد الإلكتروني"
          value={form.email ?? ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="العنوان"
          value={form.address ?? ""}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">تم الحفظ بنجاح</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </form>
    </div>
  );
}
