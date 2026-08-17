"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiRequestError } from "@/lib/apiClient";

interface InvoiceItem {
  id: string;
  product_name_snapshot: string;
  unit_name_snapshot: string | null;
  variant_name_snapshot: string | null;
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
  notes: string | null;
  balance: { current_amount_gross: number; outstanding_amount: number; total_payments: number; total_returns: number };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "bg-gray-100 text-gray-600" },
  issued: { label: "أجل", className: "bg-blue-50 text-blue-700" },
  partially_paid: { label: "مدفوعة جزئياً", className: "bg-amber-50 text-amber-700" },
  returned: { label: "مرتجع أو تالف", className: "bg-purple-50 text-purple-700" },
  paid: { label: "مدفوع", className: "bg-green-50 text-green-700" },
  cancelled: { label: "ملغاة", className: "bg-red-50 text-red-700" },
};

const CAN_RETURN_STATUSES = ["issued", "partially_paid", "returned", "paid"];

type PdfStage = "original" | "after_return" | "final";
type PdfAction = "view" | "download" | "share";

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
  const [pdfLoading, setPdfLoading] = useState<{ stage: PdfStage; action: PdfAction } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [showReturn, setShowReturn] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const [showPdfDocs, setShowPdfDocs] = useState(false);

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

  function pdfFileName(stage: PdfStage) {
    return `${invoice?.invoice_number ?? "فاتورة"}-${stage}.pdf`;
  }

  async function handleViewPdf(stage: PdfStage) {
    setPdfLoading({ stage, action: "view" });
    setError(null);
    try {
      const blob = await apiFetchBlob(`/invoices/${id}/pdf?stage=${stage}`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر عرض PDF");
    } finally {
      setPdfLoading(null);
    }
  }

  async function handleDownloadPdf(stage: PdfStage) {
    setPdfLoading({ stage, action: "download" });
    setError(null);
    try {
      const blob = await apiFetchBlob(`/invoices/${id}/pdf?stage=${stage}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName(stage);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر تحميل PDF");
    } finally {
      setPdfLoading(null);
    }
  }

  async function handleSharePdf(stage: PdfStage) {
    setPdfLoading({ stage, action: "share" });
    setError(null);
    try {
      const blob = await apiFetchBlob(`/invoices/${id}/pdf?stage=${stage}`);
      const filename = pdfFileName(stage);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        // لا يدعم المتصفح مشاركة الملفات (Web Share API) — نحمّل الملف بدلاً من ذلك
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setError("المشاركة غير مدعومة في هذا المتصفح، تم تحميل الملف بدلاً من ذلك");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // المستخدم أغلق نافذة المشاركة بنفسه — ليس خطأ
      } else {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر إرسال PDF");
      }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/invoices")} className="text-sm text-gray-500">
          ‹ رجوع
        </button>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold">{invoice.invoice_number ?? "مسودة فاتورة"}</h1>
        <p className="text-sm text-gray-500">{invoice.customers?.name}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <p className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700">المنتجات</p>
        <ul className="divide-y divide-gray-100">
          {invoice.invoice_items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {item.product_name_snapshot}
                  {item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {item.quantity} {item.unit_name_snapshot ?? ""} × {item.unit_price} ر.س
                  {item.returned_quantity > 0 && ` — مرتجع: ${item.returned_quantity}`}
                </p>
              </div>
              <p className="font-semibold">{item.line_gross} ر.س</p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
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

      {invoice.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-gray-700">ملاحظات الفاتورة</p>
          <p className="whitespace-pre-line text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
        <div className="rounded-xl border border-gray-200 bg-white p-4">
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
      )}

      {invoice.status !== "draft" && (
        <div>
          <button
            type="button"
            onClick={() => setShowPdfDocs((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
          >
            <span>مستندات PDF</span>
            <span className="text-xs font-normal text-brand-600">{showPdfDocs ? "إخفاء" : "عرض"}</span>
          </button>

          {showPdfDocs && (
            <div className="mt-2 space-y-2">
              <PdfActions
                stage="original"
                label={PDF_STAGE_META.original}
                loading={pdfLoading}
                onView={handleViewPdf}
                onDownload={handleDownloadPdf}
                onShare={handleSharePdf}
              />
              {invoice.balance.total_returns > 0 && (
                <PdfActions
                  stage="after_return"
                  label={PDF_STAGE_META.after_return}
                  loading={pdfLoading}
                  onView={handleViewPdf}
                  onDownload={handleDownloadPdf}
                  onShare={handleSharePdf}
                />
              )}
              {invoice.balance.total_payments > 0 && (
                <PdfActions
                  stage="final"
                  label={PDF_STAGE_META.final}
                  loading={pdfLoading}
                  onView={handleViewPdf}
                  onDownload={handleDownloadPdf}
                  onShare={handleSharePdf}
                />
              )}
            </div>
          )}
        </div>
      )}

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
                    <p className="text-sm font-medium">
                      {item.product_name_snapshot}
                      {item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      القابل للإرجاع: {item.remaining} {item.unit_name_snapshot ?? ""}
                    </p>
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

      {invoice.status !== "draft" &&
        invoice.status !== "cancelled" &&
        invoice.balance.total_payments === 0 &&
        invoice.balance.total_returns === 0 && (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="w-full rounded-lg border border-red-200 py-2.5 font-semibold text-red-600 disabled:opacity-60"
          >
            إلغاء الفاتورة
          </button>
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

function PdfActions({
  stage,
  label,
  loading,
  onView,
  onDownload,
  onShare,
}: {
  stage: PdfStage;
  label: string;
  loading: { stage: PdfStage; action: PdfAction } | null;
  onView: (stage: PdfStage) => void;
  onDownload: (stage: PdfStage) => void;
  onShare: (stage: PdfStage) => void;
}) {
  const busy = loading !== null && loading.stage === stage;
  const isLoading = (action: PdfAction) => busy && loading?.action === action;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="mb-2 text-sm font-semibold text-gray-700">{label}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onView(stage)}
          disabled={busy}
          className="flex-1 rounded-lg border border-brand-600 py-2 text-xs font-semibold text-brand-600 disabled:opacity-60"
        >
          {isLoading("view") ? "..." : "عرض"}
        </button>
        <button
          onClick={() => onDownload(stage)}
          disabled={busy}
          className="flex-1 rounded-lg border border-brand-600 py-2 text-xs font-semibold text-brand-600 disabled:opacity-60"
        >
          {isLoading("download") ? "..." : "تحميل"}
        </button>
        <button
          onClick={() => onShare(stage)}
          disabled={busy}
          className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isLoading("share") ? "..." : "إرسال"}
        </button>
      </div>
    </div>
  );
}
