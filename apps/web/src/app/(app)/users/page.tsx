"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "rep";
  status: "active" | "disabled";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ username: "", full_name: "", password: "", role: "rep" as "admin" | "rep" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ data: UserRow[] }>("/users").then((res) => setUsers(res.data));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ username: "", full_name: "", password: "", role: "rep" });
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إنشاء المستخدم");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: UserRow) {
    await apiFetch(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: user.status === "active" ? "disabled" : "active" }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">المستخدمون</h1>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">إضافة مستخدم</p>
        <input
          className="input"
          placeholder="اسم المستخدم (إنجليزي)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="الاسم الكامل"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="كلمة المرور (8 أحرف على الأقل)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select
          className="input"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "rep" })}
        >
          <option value="rep">مندوب</option>
          <option value="admin">مدير</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "إضافة مستخدم"}
        </button>
      </form>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{u.full_name}</p>
              <p className="text-xs text-gray-500">
                {u.username} — {u.role === "admin" ? "مدير" : "مندوب"}
              </p>
            </div>
            <button
              onClick={() => toggleStatus(u)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                u.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {u.status === "active" ? "نشط" : "معطّل"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
