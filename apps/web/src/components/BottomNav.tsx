"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavLinks";

/** القسم 22.1: Bottom Navigation Bar ثابت للجوال — App-like UI */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white pb-[var(--safe-bottom)] md:hidden"
      aria-label="التنقل الرئيسي"
    >
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              active ? "text-brand-600" : "text-gray-500"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
