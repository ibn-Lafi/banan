"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import type { City, Customer } from "@banan/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: City[] }>("/cities").then((res) => setCities(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cityFilter !== "all") params.set("city_id", cityFilter);
      apiFetch<{ data: Customer[] }>(`/customers?${params.toString()}`)
        .then((res) => setCustomers(res.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, cityFilter]);

  const cityName = (id: string | null) => cities.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">العملاء</h1>
        <Link href="/customers/new" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
          + إضافة عميل
        </Link>
      </div>

      <input
        className="input"
        placeholder="بحث بالاسم، الجوال، الرقم الضريبي..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {cities.length > 0 && (
        <select className="input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="all">كل المدن</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

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
                  <p className="text-xs text-gray-500">
                    {customer.phone ?? "بدون رقم جوال"}
                    {cityName(customer.city_id) ? `  •  ${cityName(customer.city_id)}` : ""}
                  </p>
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
