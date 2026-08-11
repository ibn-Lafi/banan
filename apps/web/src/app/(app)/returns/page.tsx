"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

interface ReturnListItem {
  id: string;
  invoice_id: string;
  return_number: string | null;
  return_date: string;
  total_amount_gross: number;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnListItem[]>([]);

  useEffect(() => {
    apiFetch<{ data: ReturnListItem[] }>("/returns").then((res) => setReturns(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">المرتجعات</h1>
      <p className="text-sm text-gray-500">يتم تسجيل المرتجع من داخل صفحة الفاتورة</p>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {returns.map((r) => (
          <li key={r.id}>
            <Link href={`/invoices/${r.invoice_id}`} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{r.return_number}</p>
                <p className="text-xs text-gray-500">{r.return_date}</p>
              </div>
              <p className="font-semibold">{r.total_amount_gross} ر.س</p>
            </Link>
          </li>
        ))}
        {returns.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد مرتجعات</li>}
      </ul>
    </div>
  );
}
