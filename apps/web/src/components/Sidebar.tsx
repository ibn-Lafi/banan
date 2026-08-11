"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navItems } from "./NavLinks";
import { clearSession, getSession } from "@/lib/session";

const secondaryLinks = [
  { href: "/products", label: "المنتجات" },
  { href: "/reports", label: "التقارير" },
];

const adminLinks = [
  { href: "/users", label: "المستخدمون" },
  { href: "/audit-log", label: "سجل العمليات" },
  { href: "/company-settings", label: "إعدادات الشركة" },
];

/** القسم 22.1: Sidebar Navigation ثابت للكمبيوتر بدل Bottom Bar */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-l border-gray-200 bg-white md:flex">
      <div className="border-b border-gray-100 px-5 py-5">
        <p className="text-lg font-bold text-brand-700">بنان</p>
        {session && <p className="mt-1 truncate text-sm text-gray-500">{session.user.full_name}</p>}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => item.href !== "/more")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

        <div className="my-2 border-t border-gray-100" />

        {secondaryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </Link>
        ))}

        {session?.user.role === "admin" && (
          <>
            <div className="my-2 border-t border-gray-100" />
            {adminLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="m-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        تسجيل الخروج
      </button>
    </aside>
  );
}
