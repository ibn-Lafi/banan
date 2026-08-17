"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Customer } from "@banan/types";
import { Modal } from "./Modal";

interface InvoiceOption {
  id: string;
  invoice_number: string | null;
  status: string;
  customer_id: string;
}

interface InvoiceWithOutstanding extends InvoiceOption {
  outstanding_amount: number;
}

const PAYMENT_METHODS = ["نقدًا", "شيك", "تحويل بنكي"];

export function QuickPaymentModal({ onClose }: { onClose: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [invoices, setInvoices] = useState<InvoiceWithOutstanding[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Customer[] }>("/customers").then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    setInvoiceId("");
    setAmount("");
    if (!customerId) {
      setInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    apiFetch<{ data: InvoiceOption[] }>(`/invoices?customer_id=${customerId}`)
      .then(async (res) => {
        const eligible = res.data.filter((inv) => ["issued", "partially_paid", "returned"].includes(inv.status));
        const withBalance = await Promise.all(
          eligible.map(async (inv) => {
            const detail = await apiFetch<{ data: { balance: { outstanding_amount: number } } }>(
              `/invoices/${inv.id}`,
            );
            return { ...inv, outstanding_amount: detail.data.balance.outstanding_amount };
          }),
        );
        setInvoices(withBalance.filter((inv) => inv.outstanding_amount > 0));
      })
      .finally(() => setLoadingInvoices(false));
  }, [customerId]);

  function handleSelectInvoice(id: string) {
    setInvoiceId(id);
    const invoice = invoices.find((inv) => inv.id === id);
    setAmount(invoice ? String(invoice.outstanding_amount) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) {
      setError("اختر الفاتورة غير المسددة");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: Number(amount),
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: paymentMethod,
        }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر تسجيل التحصيل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="تسجيل تحصيل" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">العميل</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">اختر عميلاً</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {customerId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الفاتورة غير المسددة</label>
            <select className="input" value={invoiceId} onChange={(e) => handleSelectInvoice(e.target.value)} required>
              <option value="">اختر فاتورة</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  فاتورة {inv.invoice_number ?? "—"} — متبقي {inv.outstanding_amount} ر.س
                </option>
              ))}
            </select>
            {!loadingInvoices && invoices.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">لا توجد فواتير غير مسددة لهذا العميل</p>
            )}
          </div>
        )}

        {invoiceId && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">المبلغ</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">نوع القبض</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !invoiceId}
          className="pill-btn bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saving ? "جارٍ الحفظ..." : "تسجيل التحصيل"}
        </button>
      </form>
    </Modal>
  );
}
