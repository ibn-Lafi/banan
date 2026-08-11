import type { ComponentType } from "react";
import { CustomersIcon, HomeIcon, InvoicesIcon, MoreIcon } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: HomeIcon },
  { href: "/customers", label: "العملاء", icon: CustomersIcon },
  { href: "/invoices", label: "الفواتير", icon: InvoicesIcon },
  { href: "/more", label: "المزيد", icon: MoreIcon },
];
