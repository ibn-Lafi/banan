"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavLinks";

/** القسم 22.1: Bottom Navigation Bar ثابت للجوال — App-like UI */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white/95 pb-[var(--safe-bottom)] shadow-[0_-1px_6px_rgba(0,0,0,0.04)] backdrop-blur md:hidden"
      aria-label="التنقل الرئيسي"
    >
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-brand-600" : "text-gray-400"
            }`}
          >
            <Icon className={`h-6 w-6 ${active ? "text-brand-600" : "text-gray-400"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
