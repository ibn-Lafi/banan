import type {
  CustomerStatus,
  InvoiceStatus,
  InvoiceType,
  ProductStatus,
  UserRole,
  UserStatus,
} from "./enums.js";

export interface Company {
  id: string;
  name: string;
  vat_number: string | null;
  cr_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  username: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  vat_number: string | null;
  cr_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: CustomerStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  sku: string;
  price_gross: number;
  vat_rate: number;
  status: ProductStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  customer_id: string;
  rep_id: string;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  original_amount_gross: number;
  original_amount_net: number;
  original_vat_amount: number;
  current_amount_gross: number;
  qr_code_payload: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  product_base_price: number;
  unit_price: number;
  vat_rate: number;
  line_net: number;
  line_vat: number;
  line_gross: number;
  returned_quantity: number;
}

export interface Payment {
  id: string;
  company_id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
}

export interface Return {
  id: string;
  company_id: string;
  return_number: string;
  invoice_id: string;
  rep_id: string;
  return_date: string;
  total_amount_gross: number;
  total_amount_net: number;
  total_vat_amount: number;
  created_by: string;
  created_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  invoice_item_id: string;
  returned_quantity: number;
  unit_price_at_return: number;
  line_net: number;
  line_vat: number;
  line_gross: number;
}

export interface DocumentSequence {
  id: string;
  company_id: string;
  document_type: "invoice" | "return" | "payment";
  last_number: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: unknown;
  new_value: unknown;
  metadata: unknown;
  created_at: string;
}

// شكل مشتق (derived) - يُحسب في Backend وليس مخزناً كحقل مستقل
export interface InvoiceBalance {
  invoice_id: string;
  original_amount_gross: number;
  total_returns: number;
  current_amount_gross: number;
  total_payments: number;
  outstanding_amount: number;
}

export interface CustomerStatement {
  customer_id: string;
  current_balance: number;
  total_invoices: number;
  total_returns: number;
  total_payments: number;
  outstanding_amount: number;
  overdue_amount: number;
  entries: CustomerLedgerEntry[];
}

export interface CustomerLedgerEntry {
  type: "invoice" | "return" | "payment";
  date: string;
  reference_id: string;
  reference_number: string;
  amount: number; // موجب للفاتورة، سالب للمرتجع/الدفعة
  running_balance: number;
}
