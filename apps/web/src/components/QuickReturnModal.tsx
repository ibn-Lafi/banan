"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import type { Customer } from "@banan/types";
import { Modal } from "./Modal";

interface InvoiceOption {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  status: string;
  customer_id: string;
}

interface InvoiceItemDetail {
  id: string;
  product_name_snapshot: string;
  unit_name_snapshot: string | null;
  quantity: number;
  returned_quantity: number;
}

const RETURNABLE_STATUSES = ["issued", "partially_paid", "returned", "paid"];

export function QuickReturnModal({
  onClose,
  initialCustomerId,
}: {
  onClose: () => void;
  initialCustomerId?: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [items, setItems] = useState<InvoiceItemDetail[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Customer[] }>("/customers").then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    setInvoiceId("");
    setItems([]);
    if (!customerId) {
      setInvoices([]);
      return;
    }
    apiFetch<{ data: InvoiceOption[] }>(`/invoices?customer_id=${customerId}`).then((res) =>
      setInvoices(res.data.filter((inv) => RETURNABLE_STATUSES.includes(inv.status))),
    );
  }, [customerId]);

  useEffect(() => {
    if (!invoiceId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    apiFetch<{ data: { invoice_items: InvoiceItemDetail[] } }>(`/invoices/${invoiceId}`)
      .then((res) => setItems(res.data.invoice_items))
      .finally(() => setLoadingItems(false));
  }, [invoiceId]);

  const returnableItems = items
    .map((item) => ({ ...item, remaining: item.quantity - item.returned_quantity }))
    .filter((item) => item.remaining > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = Object.entries(returnQty)
      .map(([invoice_item_id, qty]) => ({
        invoice_item_id,
        returned_quantity: Number(qty),
      }))
      .filter((line) => line.returned_quantity > 0);

    if (!invoiceId || payload.length === 0) {
      setError("اختر فاتورة وأدخل كمية مرتجعة لمنتج واحد على الأقل");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/returns", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          return_date: new Date().toISOString().slice(0, 10),
          items: payload,
        }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "تعذّر تسجيل المرتجع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="تسجيل مرتجع" onClose={onClose}>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">الفاتورة السابقة</label>
            <select className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
              <option value="">اختر فاتورة</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  فاتورة {inv.invoice_number ?? "—"} — {inv.invoice_date}
                </option>
              ))}
            </select>
            {invoiceId && !loadingItems && returnableItems.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">لا توجد كميات قابلة للإرجاع في هذه الفاتورة</p>
            )}
          </div>
        )}

        {invoiceId && returnableItems.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">حدد كمية المرتجع من بنود الفاتورة</p>
            <div className="space-y-2">
              {returnableItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{item.product_name_snapshot}</p>
                    <p className="text-xs text-gray-500">
                      الحد الأقصى: {item.remaining} {item.unit_name_snapshot ?? ""}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">الكمية المرتجعة</label>
                    <input
                      type="number"
                      min={0}
                      max={item.remaining}
                      step="0.001"
                      className="input"
                      placeholder="0"
                      value={returnQty[item.id] ?? ""}
                      onChange={(e) => setReturnQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !invoiceId}
          className="pill-btn bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saving ? "جارٍ الحفظ..." : "تسجيل المرتجع"}
        </button>
      </form>
    </Modal>
  );
}
