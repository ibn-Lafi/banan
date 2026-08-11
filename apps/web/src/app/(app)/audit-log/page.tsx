"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    apiFetch<{ data: AuditLogRow[] }>("/audit-logs").then((res) => setLogs(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سجل العمليات</h1>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {logs.map((log) => (
          <li key={log.id} className="px-4 py-3">
            <p className="text-sm font-medium">{log.action}</p>
            <p className="text-xs text-gray-500">
              {log.entity_type} — {new Date(log.created_at).toLocaleString("ar-SA")}
            </p>
          </li>
        ))}
        {logs.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد حركات بعد</li>}
      </ul>
    </div>
  );
}
