"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavLinks";
import { PlusIcon } from "./icons";

/** القسم 22.1: Bottom Navigation Bar ثابت للجوال — App-like UI */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(var(--safe-bottom)+0.5rem)] pt-2 md:hidden"
      aria-label="التنقل الرئيسي"
    >
      <div className="relative mx-auto max-w-md">
        <Link
          href="/invoices?create=1"
          aria-label="إنشاء فاتورة جديدة"
          className="absolute right-1/2 -top-7 z-10 flex h-14 w-14 translate-x-1/2 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg"
        >
          <PlusIcon className="h-6 w-6" />
        </Link>

        <div className="flex items-center justify-between rounded-full border border-gray-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
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
  );
}
