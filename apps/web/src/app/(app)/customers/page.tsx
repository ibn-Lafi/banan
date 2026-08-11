"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import type { Customer } from "@banan/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      apiFetch<{ data: Customer[] }>(`/customers${query}`)
        .then((res) => setCustomers(res.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">العملاء</h1>
        <Link href="/customers/new" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
          + إضافة عميل
        </Link>
      </div>

      <input
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        placeholder="بحث بالاسم، الجوال، الرقم الضريبي..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>
      ) : customers.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">لا يوجد عملاء بعد</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link href={`/customers/${customer.id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone ?? "بدون رقم جوال"}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    customer.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {customer.status === "active" ? "نشط" : "موقوف"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
