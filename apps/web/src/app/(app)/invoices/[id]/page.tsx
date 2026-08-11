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
  customers: { name: string } | null;
  invoice_items: InvoiceItem[];
  balance: { current_amount_gross: number; outstanding_amount: number; total_payments: number; total_returns: number };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-gray-100 text-gray-600" },
  issued: { label: "صادرة", className: "bg-blue-50 text-blue-700" },
  partially_paid: { label: "مدفوعة جزئياً", className: "bg-amber-50 text-amber-700" },
  paid: { label: "مدفوعة", className: "bg-green-50 text-green-700" },
  cancelled: { label: "ملغاة", className: "bg-red-50 text-red-700" },
};

const CAN_RETURN_STATUSES = ["issued", "partially_paid", "paid"];

type PdfStage = "original" | "after_return" | "final";

const PDF_STAGE_META: Record<PdfStage, string> = {
  original: "الفاتورة الأصلية",
  after_return: "الفاتورة بعد المرتجع",
  final: "فاتورة السداد النهائية",
};

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<PdfStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [showReturn, setShowReturn] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

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

  async function handleDownloadPdf(stage: PdfStage) {
    setPdfLoading(stage);
    setError(null);
    try {
      const blob = await apiFetchBlob(`/invoices/${id}/pdf?stage=${stage}`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر توليد PDF");
    } finally {
      setPdfLoading(null);
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

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const items = Object.entries(returnQty)
      .map(([invoice_item_id, qty]) => ({ invoice_item_id, returned_quantity: Number(qty) }))
      .filter((line) => line.returned_quantity > 0);

    if (items.length === 0) {
      setReturnError("أدخل كمية مرتجعة لمنتج واحد على الأقل");
      return;
    }

    setReturnSaving(true);
    setReturnError(null);
    try {
      await apiFetch("/returns", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: id,
          return_date: new Date().toISOString().slice(0, 10),
          items,
        }),
      });
      setReturnQty({});
      setShowReturn(false);
      await load();
    } catch (err) {
      setReturnError(err instanceof ApiRequestError ? err.message : "تعذّر تسجيل المرتجع");
    } finally {
      setReturnSaving(false);
    }
  }

  if (!invoice) return <p className="py-8 text-center text-sm text-gray-400">جارٍ التحميل...</p>;

  const statusMeta = STATUS_META[invoice.status] ?? STATUS_META.issued;
  const returnableItems = invoice.invoice_items
    .map((item) => ({ ...item, remaining: item.quantity - item.returned_quantity }))
    .filter((item) => item.remaining > 0);
  const canReturn = CAN_RETURN_STATUSES.includes(invoice.status) && returnableItems.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{invoice.invoice_number ?? "مسودة فاتورة"}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">{invoice.customers?.name}</p>
        </div>
        <button onClick={() => router.push("/invoices")} className="text-sm text-gray-500">
          رجوع
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">المنتجات</h2>
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
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">مراحل الفاتورة</h2>
        <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
          <StageRow label="الفاتورة الأصلية" sub={`شامل ضريبة ${invoice.original_vat_amount} ر.س`} value={invoice.original_amount_gross} />
          {invoice.balance.total_returns > 0 && (
            <StageRow
              label="بعد المرتجعات"
              sub={`إجمالي المرتجعات ${invoice.balance.total_returns} ر.س`}
              value={invoice.balance.current_amount_gross}
            />
          )}
          <StageRow
            label="بعد السداد (المتبقي)"
            sub={invoice.balance.total_payments > 0 ? `إجمالي المدفوع ${invoice.balance.total_payments} ر.س` : undefined}
            value={invoice.balance.outstanding_amount}
            bold
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {invoice.status !== "draft" && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">مستندات PDF</h2>
          <div className="space-y-2">
            <PdfButton
              stage="original"
              loading={pdfLoading}
              onClick={handleDownloadPdf}
              label={PDF_STAGE_META.original}
            />
            {invoice.balance.total_returns > 0 && (
              <PdfButton
                stage="after_return"
                loading={pdfLoading}
                onClick={handleDownloadPdf}
                label={PDF_STAGE_META.after_return}
              />
            )}
            {invoice.balance.total_payments > 0 && (
              <PdfButton stage="final" loading={pdfLoading} onClick={handleDownloadPdf} label={PDF_STAGE_META.final} />
            )}
          </div>
        </div>
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
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">تسجيل دفعة</h2>
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
          </div>

          {canReturn && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">مرتجع</h2>
                <button
                  type="button"
                  onClick={() => setShowReturn((v) => !v)}
                  className="text-sm font-semibold text-brand-600"
                >
                  {showReturn ? "إخفاء" : "+ تسجيل مرتجع"}
                </button>
              </div>

              {showReturn && (
                <form onSubmit={handleCreateReturn} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  {returnableItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.product_name_snapshot}</p>
                        <p className="text-xs text-gray-500">القابل للإرجاع: {item.remaining}</p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={item.remaining}
                        step="0.001"
                        className="input w-28"
                        placeholder="0"
                        value={returnQty[item.id] ?? ""}
                        onChange={(e) => setReturnQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    </div>
                  ))}

                  {returnError && <p className="text-sm text-red-600">{returnError}</p>}

                  <button
                    type="submit"
                    disabled={returnSaving}
                    className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
                  >
                    {returnSaving ? "جارٍ الحفظ..." : "تسجيل المرتجع"}
                  </button>
                </form>
              )}
            </div>
          )}

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

function StageRow({ label, value, sub, bold }: { label: string; value: number; sub?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${bold ? "font-bold text-gray-900" : "text-gray-600"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className={bold ? "text-lg font-bold" : "font-semibold text-gray-700"}>{value} ر.س</p>
    </div>
  );
}

function PdfButton({
  stage,
  label,
  loading,
  onClick,
}: {
  stage: "original" | "after_return" | "final";
  label: string;
  loading: "original" | "after_return" | "final" | null;
  onClick: (stage: "original" | "after_return" | "final") => void;
}) {
  return (
    <button
      onClick={() => onClick(stage)}
      disabled={loading !== null}
      className="flex w-full items-center justify-between rounded-lg border border-brand-600 px-4 py-2.5 font-semibold text-brand-600 disabled:opacity-60"
    >
      <span>{label}</span>
      <span className="text-xs">{loading === stage ? "جارٍ التجهيز..." : "عرض / تحميل PDF"}</span>
    </button>
  );
}
