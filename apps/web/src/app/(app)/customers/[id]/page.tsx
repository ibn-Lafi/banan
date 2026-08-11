"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import type { Customer, CustomerStatement } from "@banan/types";

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);

  useEffect(() => {
    apiFetch<{ data: Customer }>(`/customers/${id}`).then((res) => setCustomer(res.data));
    apiFetch<{ data: CustomerStatement }>(`/customers/${id}/statement`).then((res) => setStatement(res.data));
  }, [id]);

  if (!customer) return <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{customer.name}</h1>
        <p className="text-sm text-gray-500">{customer.phone ?? "—"}</p>
      </div>

      {statement && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="الرصيد الحالي" value={statement.current_balance} />
          <Stat label="إجمالي الفواتير" value={statement.total_invoices} />
          <Stat label="إجمالي المرتجعات" value={statement.total_returns} />
          <Stat label="إجمالي المدفوعات" value={statement.total_payments} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">كشف الحساب</h2>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {statement?.entries.map((entry) => (
            <li key={`${entry.type}-${entry.reference_id}`} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{entry.reference_number || entryLabel(entry.type)}</p>
                <p className="text-xs text-gray-500">{entry.date}</p>
              </div>
              <div className="text-left">
                <p className={entry.amount >= 0 ? "text-green-700" : "text-red-600"}>
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </p>
                <p className="text-xs text-gray-400">الرصيد: {entry.running_balance}</p>
              </div>
            </li>
          ))}
          {statement?.entries.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد حركات بعد</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function entryLabel(type: "invoice" | "return" | "payment") {
  return { invoice: "فاتورة", return: "مرتجع", payment: "دفعة" }[type];
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value} ر.س</p>
    </div>
  );
}
