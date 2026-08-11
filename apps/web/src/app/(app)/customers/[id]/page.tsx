"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import type { Customer, CustomerStatement } from "@banan/types";

const ENTRY_META: Record<string, { label: string; className: string }> = {
  invoice: { label: "فاتورة", className: "bg-blue-50 text-blue-700" },
  return: { label: "مرتجع", className: "bg-purple-50 text-purple-700" },
  payment: { label: "دفعة", className: "bg-green-50 text-green-700" },
};

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);

  useEffect(() => {
    apiFetch<{ data: Customer }>(`/customers/${id}`).then((res) => setCustomer(res.data));
    apiFetch<{ data: CustomerStatement }>(`/customers/${id}/statement`).then((res) => setStatement(res.data));
  }, [id]);

  if (!customer) return <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/customers")} className="text-sm text-gray-500">
          ‹ رجوع
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            customer.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {customer.status === "active" ? "نشط" : "موقوف"}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold">{customer.name}</h1>
        <p className="text-sm text-gray-500">{customer.phone ?? "بدون رقم جوال"}</p>
      </div>

      {statement && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">الرصيد الحالي</p>
            <p className="mt-1 text-2xl font-bold">{statement.current_balance} ر.س</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="الفواتير" value={statement.total_invoices} />
            <Stat label="المرتجعات" value={statement.total_returns} />
            <Stat label="المدفوعات" value={statement.total_payments} />
          </div>
        </>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">كشف الحساب</h2>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {statement?.entries.map((entry) => {
            const meta = ENTRY_META[entry.type];
            return (
              <li key={`${entry.type}-${entry.reference_id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{entry.reference_number || meta.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{entry.date}</p>
                </div>
                <div className="text-left">
                  <p className={entry.amount >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-600"}>
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount}
                  </p>
                  <p className="text-xs text-gray-400">الرصيد: {entry.running_balance}</p>
                </div>
              </li>
            );
          })}
          {statement?.entries.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد حركات بعد</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold">{value} ر.س</p>
    </div>
  );
}
