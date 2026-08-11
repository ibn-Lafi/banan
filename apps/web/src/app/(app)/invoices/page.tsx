"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { CreateInvoiceForm } from "@/components/CreateInvoiceForm";

interface InvoiceListItem {
  id: string;
  invoice_number: string | null;
  status: string;
  original_amount_gross: number;
  invoice_date: string;
  customers: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    apiFetch<{ data: InvoiceListItem[] }>("/invoices")
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الفواتير</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? "إخفاء النموذج" : "+ فاتورة جديدة"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <CreateInvoiceForm />
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>
      ) : invoices.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">لا توجد فواتير بعد</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{invoice.invoice_number ?? "مسودة"}</p>
                  <p className="text-xs text-gray-500">{invoice.customers?.name ?? "—"}</p>
                </div>
                <div className="text-left">
                  <p className="font-semibold">{invoice.original_amount_gross} ر.س</p>
                  <p className="text-xs text-gray-400">{STATUS_LABELS[invoice.status] ?? invoice.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
