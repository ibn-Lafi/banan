"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

export default function MorePage() {
  const router = useRouter();
  const session = getSession();

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  const links = [
    { href: "/products", label: "المنتجات" },
    { href: "/returns", label: "المرتجعات" },
    { href: "/reports", label: "التقارير" },
    ...(session?.user.role === "admin"
      ? [
          { href: "/users", label: "المستخدمون" },
          { href: "/audit-log", label: "سجل العمليات" },
          { href: "/company-settings", label: "إعدادات الشركة" },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">المزيد</h1>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block px-4 py-3">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-gray-200 py-2.5 font-semibold text-gray-600"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
