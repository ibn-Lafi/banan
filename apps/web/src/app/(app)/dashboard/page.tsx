"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getSession } from "@/lib/session";
import { QuickInvoiceModal } from "@/components/QuickInvoiceModal";

interface ReportSummary {
  invoices_count: number;
  total_sales: number;
  total_returns: number;
  total_payments: number;
  total_outstanding: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const session = getSession();

  useEffect(() => {
    apiFetch<{ data: ReportSummary }>("/reports")
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="space-y-4">
      <div className="-mx-4 -mt-4 rounded-b-[2rem] bg-gray-900 px-4 pb-10 pt-6 text-white">
        <h1 className="text-xl font-bold">مرحباً {session?.user.full_name ?? ""}</h1>
        <p className="text-sm text-gray-400">نظرة سريعة على أدائك</p>
      </div>

      <div className="-mt-8">
        <button
          onClick={() => setShowCreate(true)}
          className="block w-full rounded-2xl bg-white px-4 py-4 text-center font-semibold text-gray-900 shadow-lg ring-1 ring-black/5"
        >
          + إنشاء فاتورة جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="عدد الفواتير" value={summary?.invoices_count ?? "—"} />
        <StatCard label="إجمالي المبيعات" value={summary ? `${summary.total_sales} ر.س` : "—"} />
        <StatCard label="إجمالي المرتجعات" value={summary ? `${summary.total_returns} ر.س` : "—"} />
        <StatCard label="المبلغ المطلوب" value={summary ? `${summary.total_outstanding} ر.س` : "—"} />
      </div>

      {showCreate && <QuickInvoiceModal onClose={() => setShowCreate(false)} />}
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
