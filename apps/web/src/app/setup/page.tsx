"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch, ApiRequestError } from "@/lib/apiClient";

const initialCompany = { name: "", vat_number: "", cr_number: "", phone: "", email: "", address: "" };
const initialAdmin = { username: "", full_name: "", password: "" };

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [company, setCompany] = useState(initialCompany);
  const [admin, setAdmin] = useState(initialAdmin);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ needs_setup: boolean }>("/setup/status", { auth: false })
      .then((res) => setNeedsSetup(res.needs_setup))
      .catch((err) => {
        setNeedsSetup(false);
        setCheckError(
          err instanceof ApiRequestError
            ? err.message
            : `تعذّر الاتصال بالـ API على الرابط: ${API_URL} — تأكد أن هذا الرابط صحيح وأن CORS_ORIGIN في خدمة الـ api يطابق رابط هذا الموقع بالضبط`,
        );
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/setup/bootstrap", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ setup_token: setupToken, company, admin }),
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إتمام الإعداد");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return <p className="py-16 text-center text-sm text-gray-400">جارٍ التحقق...</p>;
  }

  if (checkError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="mb-2 font-semibold text-red-600">تعذّر التحقق من حالة الإعداد</p>
          <p className="text-sm text-gray-500">{checkError}</p>
        </div>
      </main>
    );
  }

  if (!needsSetup) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="mb-4 font-semibold">تم إعداد النظام بالفعل</p>
          <a href="/login" className="text-brand-600 underline">
            الذهاب لتسجيل الدخول
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-700">إعداد النظام لأول مرة</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          هذه الصفحة تعمل مرة واحدة فقط — لإنشاء بيانات شركتك وأول حساب مدير
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">رمز الإعداد (SETUP_TOKEN)</label>
            <input
              className="input"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-400">القيمة التي وضعتها في متغيرات بيئة الـ API</p>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-700">بيانات الشركة</legend>
            <input
              className="input"
              placeholder="الاسم التجاري"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="الرقم الضريبي"
              value={company.vat_number}
              onChange={(e) => setCompany({ ...company, vat_number: e.target.value })}
            />
            <input
              className="input"
              placeholder="السجل التجاري"
              value={company.cr_number}
              onChange={(e) => setCompany({ ...company, cr_number: e.target.value })}
            />
            <input
              className="input"
              placeholder="رقم الجوال"
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
            <input
              className="input"
              placeholder="البريد الإلكتروني"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
            <input
              className="input"
              placeholder="العنوان"
              value={company.address}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-gray-700">حساب المدير الأول</legend>
            <input
              className="input"
              placeholder="اسم المستخدم (إنجليزي، بدون مسافات)"
              value={admin.username}
              onChange={(e) => setAdmin({ ...admin, username: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="الاسم الكامل"
              value={admin.full_name}
              onChange={(e) => setAdmin({ ...admin, full_name: e.target.value })}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="كلمة المرور (8 أحرف على الأقل)"
              value={admin.password}
              onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
              required
            />
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "جارٍ الإعداد..." : "إتمام الإعداد وإنشاء حساب المدير"}
          </button>
        </form>
      </div>
    </main>
  );
}
