"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface ReportSummary {
  invoices_count: number;
  returns_count: number;
  payments_count: number;
  total_sales: number;
  total_returns: number;
  total_payments: number;
  total_outstanding: number;
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    apiFetch<{ data: ReportSummary }>(`/reports?${params.toString()}`).then((res) => setSummary(res.data));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">التقارير</h1>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          onClick={load}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white"
        >
          تطبيق
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="عدد الفواتير" value={summary.invoices_count} />
          <Stat label="عدد المرتجعات" value={summary.returns_count} />
          <Stat label="عدد الدفعات" value={summary.payments_count} />
          <Stat label="إجمالي المبيعات" value={`${summary.total_sales} ر.س`} />
          <Stat label="إجمالي المرتجعات" value={`${summary.total_returns} ر.س`} />
          <Stat label="إجمالي المدفوعات" value={`${summary.total_payments} ر.س`} />
          <Stat label="إجمالي المبلغ المطلوب" value={`${summary.total_outstanding} ر.س`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
