"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getSession } from "@/lib/session";
import { CreateInvoiceForm } from "@/components/CreateInvoiceForm";

interface ReportSummary {
  invoices_count: number;
  total_sales: number;
  total_returns: number;
  total_payments: number;
  total_outstanding: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const session = getSession();

  useEffect(() => {
    apiFetch<{ data: ReportSummary }>("/reports")
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">مرحباً {session?.user.full_name ?? ""}</h1>
        <p className="text-sm text-gray-500">نظرة سريعة على أدائك</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="عدد الفواتير" value={summary?.invoices_count ?? "—"} />
        <StatCard label="إجمالي المبيعات" value={summary ? `${summary.total_sales} ر.س` : "—"} />
        <StatCard label="إجمالي المرتجعات" value={summary ? `${summary.total_returns} ر.س` : "—"} />
        <StatCard label="المبلغ المطلوب" value={summary ? `${summary.total_outstanding} ر.س` : "—"} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-bold">فاتورة جديدة</h2>
        <CreateInvoiceForm />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
