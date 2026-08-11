export const UserRole = {
  ADMIN: "admin",
  REP: "rep",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "active",
  DISABLED: "disabled",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const CustomerStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const ProductStatus = {
  ACTIVE: "active",
  DISABLED: "disabled",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

// OD-15: عميل بدون رقم ضريبي => الفاتورة تتحول تلقائياً لـ simplified
export const InvoiceType = {
  STANDARD: "standard",
  SIMPLIFIED: "simplified",
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];

// لا يوجد تاريخ استحقاق للفواتير الآجلة في هذا النظام — تبقى الفاتورة
// "issued" (أو "partially_paid") إلى أن تُسدَّد بالكامل، بدون موعد نهائي
// أو حالة "متأخرة"، حسب متى ما دفع العميل.
export const InvoiceStatus = {
  DRAFT: "draft",
  ISSUED: "issued",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const DocumentType = {
  INVOICE: "invoice",
  RETURN: "return",
  PAYMENT: "payment",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const AuditAction = {
  CREATE_CUSTOMER: "create_customer",
  UPDATE_CUSTOMER: "update_customer",
  CREATE_PRODUCT: "create_product",
  UPDATE_PRODUCT: "update_product",
  UPDATE_PRODUCT_PRICE: "update_product_price",
  CREATE_INVOICE_DRAFT: "create_invoice_draft",
  UPDATE_INVOICE_DRAFT: "update_invoice_draft",
  ISSUE_INVOICE: "issue_invoice",
  CANCEL_INVOICE: "cancel_invoice",
  CREATE_PAYMENT: "create_payment",
  CREATE_RETURN: "create_return",
  UPDATE_COMPANY_SETTINGS: "update_company_settings",
  CREATE_USER: "create_user",
  UPDATE_USER: "update_user",
  DISABLE_USER: "disable_user",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
