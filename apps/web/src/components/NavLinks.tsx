export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: "🏠" },
  { href: "/invoices/create", label: "فاتورة جديدة", icon: "➕" },
  { href: "/customers", label: "العملاء", icon: "👥" },
  { href: "/invoices", label: "الفواتير", icon: "🧾" },
  { href: "/more", label: "المزيد", icon: "☰" },
];
