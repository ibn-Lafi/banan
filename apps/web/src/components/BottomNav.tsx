"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavLinks";
import { PlusIcon } from "./icons";
import { QuickReturnModal } from "./QuickReturnModal";
import { QuickPaymentModal } from "./QuickPaymentModal";

/** القسم 22.1: Bottom Navigation Bar ثابت للجوال — App-like UI */
export function BottomNav() {
  const pathname = usePathname();
  const [showActions, setShowActions] = useState(false);
  const [activeModal, setActiveModal] = useState<"return" | "payment" | null>(null);

  return (
    <>
      {showActions && (
        <button
          aria-label="إغلاق"
          onClick={() => setShowActions(false)}
          className="fixed inset-0 z-10 bg-gray-900/40 md:hidden"
        />
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(var(--safe-bottom)+0.5rem)] pt-2 md:hidden"
        aria-label="التنقل الرئيسي"
      >
        <div className="relative mx-auto max-w-md">
          {showActions && (
            <div className="absolute inset-x-6 -top-[13.5rem] space-y-1 rounded-2xl bg-white p-2 shadow-xl">
              <Link
                href="/invoices?create=1"
                onClick={() => setShowActions(false)}
                className="block rounded-xl px-4 py-3 text-center font-medium text-gray-800 hover:bg-gray-50"
              >
                فاتورة جديدة
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowActions(false);
                  setActiveModal("return");
                }}
                className="block w-full rounded-xl px-4 py-3 text-center font-medium text-gray-800 hover:bg-gray-50"
              >
                تسجيل مرتجع
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowActions(false);
                  setActiveModal("payment");
                }}
                className="block w-full rounded-xl px-4 py-3 text-center font-medium text-gray-800 hover:bg-gray-50"
              >
                تحصيل
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            aria-label={showActions ? "إغلاق القائمة" : "إجراء سريع"}
            aria-expanded={showActions}
            className="absolute right-1/2 -top-7 z-10 flex h-14 w-14 translate-x-1/2 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-transform"
          >
            <PlusIcon className={`h-6 w-6 transition-transform ${showActions ? "rotate-45" : ""}`} />
          </button>

          <div className="flex items-center justify-between rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowActions(false)}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors ${
                    active ? "bg-gray-100 text-gray-900" : "text-gray-400"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-gray-900" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {activeModal === "return" && <QuickReturnModal onClose={() => setActiveModal(null)} />}
      {activeModal === "payment" && <QuickPaymentModal onClose={() => setActiveModal(null)} />}
    </>
  );
}
