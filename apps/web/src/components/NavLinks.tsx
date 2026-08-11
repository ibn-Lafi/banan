export interface NavItem {
  href: string;
  label: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/invoices/create", label: "فاتورة جديدة" },
  { href: "/customers", label: "العملاء" },
  { href: "/invoices", label: "الفواتير" },
  { href: "/more", label: "المزيد" },
];
