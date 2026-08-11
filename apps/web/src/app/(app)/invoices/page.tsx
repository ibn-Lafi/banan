"use client";

import { useEffect, useMemo, useState } from "react";
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

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-gray-100 text-gray-600" },
  issued: { label: "صادرة", className: "bg-blue-50 text-blue-700" },
  partially_paid: { label: "مدفوعة جزئياً", className: "bg-amber-50 text-amber-700" },
  paid: { label: "مدفوعة", className: "bg-green-50 text-green-700" },
  cancelled: { label: "ملغاة", className: "bg-red-50 text-red-700" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "issued", label: "صادرة" },
  { key: "partially_paid", label: "مدفوعة جزئياً" },
  { key: "paid", label: "مدفوعة" },
  { key: "cancelled", label: "ملغاة" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  function load() {
    apiFetch<{ data: InvoiceListItem[] }>("/invoices")
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(
    () => (filter === "all" ? invoices : invoices.filter((i) => i.status === filter)),
    [invoices, filter],
  );

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
          <CreateInvoiceForm
            onCreated={() => {
              setShowCreate(false);
              load();
            }}
          />
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">لا توجد فواتير</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filtered.map((invoice) => {
            const statusMeta = STATUS_META[invoice.status] ?? STATUS_META.issued;
            return (
              <li key={invoice.id}>
                <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{invoice.invoice_number ?? "مسودة"}</p>
                    <p className="text-xs text-gray-500">{invoice.customers?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{invoice.invoice_date}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{invoice.original_amount_gross} ر.س</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
