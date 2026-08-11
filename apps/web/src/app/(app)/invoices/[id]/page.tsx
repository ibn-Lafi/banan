"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiRequestError } from "@/lib/apiClient";

interface InvoiceItem {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  line_gross: number;
  returned_quantity: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string | null;
  status: string;
  original_amount_gross: number;
  original_vat_amount: number;
  due_date: string | null;
  customers: { name: string } | null;
  invoice_items: InvoiceItem[];
  balance: { current_amount_gross: number; outstanding_amount: number; total_payments: number; total_returns: number };
}

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  async function load() {
    const res = await apiFetch<{ data: InvoiceDetail }>(`/invoices/${id}`);
    setInvoice(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleIssue() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/invoices/${id}/issue`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إصدار الفاتورة");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("هل أنت متأكد من إلغاء الفاتورة؟")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/invoices/${id}/cancel`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إلغاء الفاتورة");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setError(null);
    try {
      const blob = await apiFetchBlob(`/invoices/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر توليد PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: id,
          amount: Number(paymentAmount),
          payment_date: new Date().toISOString().slice(0, 10),
        }),
      });
      setPaymentAmount("");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر تسجيل الدفعة");
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) return <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{invoice.invoice_number ?? "مسودة فاتورة"}</h1>
          <p className="text-sm text-gray-500">{invoice.customers?.name}</p>
        </div>
        <button onClick={() => router.push("/invoices")} className="text-sm text-gray-500">
          رجوع
        </button>
      </div>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {invoice.invoice_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{item.product_name_snapshot}</p>
              <p className="text-xs text-gray-500">
                {item.quantity} × {item.unit_price} ر.س
                {item.returned_quantity > 0 && ` — مرتجع: ${item.returned_quantity}`}
              </p>
            </div>
            <p className="font-semibold">{item.line_gross} ر.س</p>
          </li>
        ))}
      </ul>

      <div className="space-y-1 rounded-xl bg-gray-100 p-4 text-sm">
        <Row label="الإجمالي الأصلي" value={invoice.original_amount_gross} />
        <Row label="الضريبة" value={invoice.original_vat_amount} />
        <Row label="إجمالي المرتجعات" value={invoice.balance.total_returns} />
        <Row label="المبلغ الحالي" value={invoice.balance.current_amount_gross} />
        <Row label="المدفوع" value={invoice.balance.total_payments} />
        <Row label="المتبقي" value={invoice.balance.outstanding_amount} bold />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {invoice.status !== "draft" && (
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="w-full rounded-lg border border-brand-600 py-2.5 font-semibold text-brand-600 disabled:opacity-60"
        >
          {pdfLoading ? "جارٍ التجهيز..." : "عرض / تحميل PDF"}
        </button>
      )}

      {invoice.status === "draft" && (
        <button
          onClick={handleIssue}
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          إصدار الفاتورة
        </button>
      )}

      {invoice.status !== "draft" && invoice.status !== "cancelled" && (
        <>
          <form onSubmit={handleAddPayment} className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min={0.01}
              className="input"
              placeholder="مبلغ الدفعة"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="whitespace-nowrap rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-60"
            >
              تسجيل دفعة
            </button>
          </form>

          {invoice.balance.total_payments === 0 && invoice.balance.total_returns === 0 && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="w-full rounded-lg border border-red-200 py-2.5 font-semibold text-red-600 disabled:opacity-60"
            >
              إلغاء الفاتورة
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value} ر.س</span>
    </div>
  );
}
