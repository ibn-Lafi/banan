import path from "node:path";
import React from "react";
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import type { Company, Customer, Invoice, InvoiceItem } from "@banan/types";

// يُشغَّل الخادم دائماً بحيث cwd = apps/api (سواء dev عبر tsx أو production عبر
// `pnpm --filter @banan/api start`)، فهذا المسار موثوق في الحالتين بدون تعقيد
// حساب مسار نسبي لملف dist المُصرَّف.
const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  Font.register({
    family: "Cairo",
    fonts: [
      { src: path.join(FONTS_DIR, "Cairo-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(FONTS_DIR, "Cairo-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // القسم 14: الأرقام والرموز يجب أن تبقى LTR داخل سياق RTL — react-pdf يطبّق
  // خوارزمية bidi تلقائياً على مستوى الحروف، لكن نعطّل hyphenation لتفادي
  // تكسير الكلمات العربية بشكل غير صحيح عند التفاف السطر.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

// ترتيب/تخطيط رسمي كلاسيكي (خطوط فاصلة، جداول مسطّرة، عناوين واضحة) بدون أي
// تلوين قوي — رمادي فاتح محايد فقط (نفس روح أول نسخة قبل أي تجربة ألوان).
const INK = "#111827";
const INK_SOFT = "#1f2937";
const GRAY = "#6b7280";
const GRAY_LIGHT = "#9ca3af";
const BORDER = "#e5e7eb";
const BORDER_LIGHT = "#f0f0f0";
const ROW_ALT = "#f9fafb";
const NEUTRAL_FILL = "#f3f4f6";
const NEUTRAL_TEXT = "#374151";
const HEADER_FILL = NEUTRAL_FILL;

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "مسودة", bg: NEUTRAL_FILL, text: NEUTRAL_TEXT },
  issued: { label: "صادرة", bg: NEUTRAL_FILL, text: NEUTRAL_TEXT },
  partially_paid: { label: "مدفوعة جزئياً", bg: NEUTRAL_FILL, text: NEUTRAL_TEXT },
  paid: { label: "مدفوعة بالكامل", bg: NEUTRAL_FILL, text: NEUTRAL_TEXT },
  cancelled: { label: "ملغاة", bg: NEUTRAL_FILL, text: NEUTRAL_TEXT },
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    direction: "rtl",
    fontSize: 9.5,
    color: INK_SOFT,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },

  // ===== رأس الصفحة =====
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyBlock: { maxWidth: "55%" },
  companyName: { fontSize: 15, fontWeight: "bold", color: INK, marginBottom: 5 },
  metaLine: { fontSize: 8.5, color: GRAY, marginBottom: 2, lineHeight: 1.5 },

  invoiceBlock: { alignItems: "flex-end" },
  invoiceTitle: { fontSize: 20, fontWeight: "bold", color: INK, letterSpacing: 1, marginBottom: 12 },
  invoiceMetaTable: { alignItems: "flex-end" },
  invoiceMetaRow: { flexDirection: "row", marginBottom: 3 },
  invoiceMetaLabel: { fontSize: 8.5, color: GRAY, marginLeft: 10 },
  invoiceMetaValue: { fontSize: 8.5, fontWeight: "bold", color: INK },

  headerRule: { borderBottom: `2px solid ${INK}`, marginTop: 18, marginBottom: 16 },

  // ===== شريط رقم الفاتورة + الحالة =====
  subHeaderRow: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginBottom: 20 },
  invoiceNumberValue: { fontSize: 16, fontWeight: "bold", color: INK, marginBottom: 10 },
  statusBadge: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 12 },
  statusBadgeText: { fontSize: 8.5, fontWeight: "bold" },

  // ===== بيانات العميل =====
  customerBlock: { borderTop: `1px solid ${BORDER_LIGHT}`, borderBottom: `1px solid ${BORDER_LIGHT}`, paddingVertical: 10, marginBottom: 22 },
  customerName: { fontSize: 11.5, fontWeight: "bold", color: INK, marginBottom: 3 },
  customerLine: { fontSize: 8.5, color: GRAY, marginBottom: 1.5 },

  // ===== جدول البنود =====
  table: { marginBottom: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: HEADER_FILL, paddingVertical: 7, paddingHorizontal: 8 },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottom: `1px solid ${BORDER_LIGHT}` },
  th: { fontWeight: "bold", fontSize: 8, color: NEUTRAL_TEXT },
  td: { fontSize: 9, color: INK_SOFT },
  tdMuted: { fontSize: 7.5, color: GRAY_LIGHT },
  colIndex: { width: 20, textAlign: "center" },
  colProduct: { flexGrow: 2.6, flexBasis: 0, paddingRight: 4 },
  colNum: { flexGrow: 1, flexBasis: 0, textAlign: "center" },

  // ===== الإجماليات =====
  totalsWrap: { marginTop: 20 },

  totalsCard: { width: "100%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalsRowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTop: `1px solid ${BORDER_LIGHT}`,
  },
  totalsLabel: { fontSize: 9, color: GRAY },
  totalsValue: { fontSize: 9, color: INK_SOFT },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: HEADER_FILL,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: "bold", color: INK },
  grandTotalValue: { fontSize: 13, fontWeight: "bold", color: INK },

  adjustmentsBlock: { marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${BORDER}` },
  outstandingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTop: `2px solid ${INK}`,
  },
  outstandingLabel: { fontSize: 10, fontWeight: "bold", color: INK },
  outstandingValue: { fontSize: 13, fontWeight: "bold", color: INK },

  // ===== QR =====
  qrBlock: { alignItems: "center", marginTop: 20 },
  qrImage: { width: 85, height: 85 },
});

function money(value: number) {
  return `${value.toFixed(2)} ر.س`;
}

// خوارزمية bidi تعكس بصرياً ترتيب المقاطع الرقمية المفصولة بشرطة (مثل تاريخ
// ISO "2026-08-11") داخل سياق RTL لأن الشرطة حرف محايد بين أرقام "ضعيفة" الاتجاه.
// علامات يونيكود LRI/PDI غير موجودة في خط Cairo المُضمَّن، فنستخدم بدلاً منها
// Text متداخل بخاصية direction: "ltr" ليبقى المقطع بصرياً كما هو دون قلب.
function LtrSpan(value: string, style?: object) {
  return React.createElement(Text, { style: { direction: "ltr", ...style } }, value);
}

export interface InvoicePdfInput {
  company: Company;
  customer: Customer;
  invoice: Invoice;
  items: InvoiceItem[];
  balance: {
    original_amount_gross: number;
    total_returns: number;
    current_amount_gross: number;
    total_payments: number;
    outstanding_amount: number;
  };
}

async function buildQrImage(payload: string | null): Promise<string | null> {
  if (!payload) return null;
  try {
    // payload مخزَّن كنص TLV مُرمَّز Base64 (القسم 14.1) — نولّد صورة QR تُشفّر
    // نفس هذا النص، وهذا ما تتوقعه أي قارئ متوافق مع ZATCA Phase 1 عند المسح.
    return await QRCode.toDataURL(payload, { margin: 0, width: 300, color: { dark: INK } });
  } catch {
    return null;
  }
}

function InvoiceMetaRow(label: string, valueNode: React.ReactNode) {
  return React.createElement(
    View,
    { style: styles.invoiceMetaRow },
    valueNode,
    React.createElement(Text, { style: styles.invoiceMetaLabel }, label),
  );
}

function InvoiceDocument({ company, customer, invoice, items, balance }: InvoicePdfInput, qrDataUrl: string | null) {
  const hasReturns = balance.total_returns > 0;
  const hasPayments = balance.total_payments > 0;
  const hasAdjustments = hasReturns || hasPayments;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // ===== رأس الصفحة: بيانات الشركة يمين، عنوان الفاتورة وتواريخها يسار =====
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          View,
          { style: styles.companyBlock },
          React.createElement(Text, { style: styles.companyName }, company.name),
          company.vat_number &&
            React.createElement(Text, { style: styles.metaLine }, `الرقم الضريبي: ${company.vat_number}`),
          company.cr_number &&
            React.createElement(Text, { style: styles.metaLine }, `السجل التجاري: ${company.cr_number}`),
          (company.phone || company.email) &&
            React.createElement(
              Text,
              { style: styles.metaLine },
              [company.phone, company.email].filter(Boolean).join("  •  "),
            ),
          company.address && React.createElement(Text, { style: styles.metaLine }, company.address),
        ),
        React.createElement(
          View,
          { style: styles.invoiceBlock },
          React.createElement(Text, { style: styles.invoiceTitle }, "فاتورة ضريبية"),
          React.createElement(Text, { style: styles.invoiceNumberValue }, invoice.invoice_number ?? "—"),
          React.createElement(
            View,
            { style: styles.invoiceMetaTable },
            InvoiceMetaRow("تاريخ الفاتورة", LtrSpan(invoice.invoice_date, styles.invoiceMetaValue)),
          ),
        ),
      ),

      React.createElement(View, { style: styles.headerRule }),

      // ===== شارة الحالة =====
      React.createElement(
        View,
        { style: styles.subHeaderRow },
        (() => {
          const statusMeta = STATUS_META[invoice.status] ?? { label: invoice.status, bg: "#f3f4f6", text: "#374151" };
          return React.createElement(
            View,
            { style: [styles.statusBadge, { backgroundColor: statusMeta.bg }] },
            React.createElement(Text, { style: [styles.statusBadgeText, { color: statusMeta.text }] }, statusMeta.label),
          );
        })(),
      ),

      // ===== بيانات العميل =====
      React.createElement(
        View,
        { style: styles.customerBlock },
        React.createElement(Text, { style: styles.customerName }, customer.name),
        customer.vat_number &&
          React.createElement(Text, { style: styles.customerLine }, `الرقم الضريبي: ${customer.vat_number}`),
        customer.cr_number &&
          React.createElement(Text, { style: styles.customerLine }, `السجل التجاري: ${customer.cr_number}`),
        customer.phone && React.createElement(Text, { style: styles.customerLine }, `الجوال: ${customer.phone}`),
        customer.address && React.createElement(Text, { style: styles.customerLine }, customer.address),
      ),

      // ===== جدول البنود =====
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.th, styles.colIndex] }, "#"),
          React.createElement(Text, { style: [styles.th, styles.colProduct] }, "المنتج"),
          React.createElement(Text, { style: [styles.th, styles.colNum] }, "الكمية"),
          React.createElement(Text, { style: [styles.th, styles.colNum] }, "سعر الوحدة"),
          React.createElement(Text, { style: [styles.th, styles.colNum] }, "قبل الضريبة"),
          React.createElement(Text, { style: [styles.th, styles.colNum] }, "الضريبة"),
          React.createElement(Text, { style: [styles.th, styles.colNum] }, "الإجمالي"),
        ),
        ...items.map((item, index) =>
          React.createElement(
            View,
            {
              style: [styles.tableRow, index % 2 === 1 ? { backgroundColor: ROW_ALT } : {}],
              key: item.id,
            },
            React.createElement(Text, { style: [styles.td, styles.colIndex] }, String(index + 1)),
            React.createElement(
              Text,
              { style: [styles.td, styles.colProduct] },
              item.product_name_snapshot,
              item.returned_quantity > 0
                ? React.createElement(Text, { style: styles.tdMuted }, `  (مرتجع: ${item.returned_quantity})`)
                : null,
            ),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, String(item.quantity)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.unit_price.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_net.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_vat.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_gross.toFixed(2)),
          ),
        ),
        React.createElement(View, { style: { borderTop: `2px solid ${BORDER}` } }),
      ),

      // ===== الإجماليات (بنفس عرض جدول المنتجات) =====
      React.createElement(
        View,
        { style: styles.totalsWrap },
        React.createElement(
          View,
          { style: styles.totalsCard },
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, { style: styles.totalsLabel }, "الإجمالي قبل الضريبة"),
            React.createElement(Text, { style: styles.totalsValue }, money(invoice.original_amount_net)),
          ),
          React.createElement(
            View,
            { style: styles.totalsRowBorder },
            React.createElement(Text, { style: styles.totalsLabel }, "إجمالي الضريبة (15%)"),
            React.createElement(Text, { style: styles.totalsValue }, money(invoice.original_vat_amount)),
          ),
          React.createElement(
            View,
            { style: styles.grandTotalRow },
            React.createElement(Text, { style: styles.grandTotalLabel }, "الإجمالي شامل الضريبة"),
            React.createElement(Text, { style: styles.grandTotalValue }, money(invoice.original_amount_gross)),
          ),

          // القسم 14: إن تأثرت الفاتورة بمرتجع أو دفعة، تُعرض التفاصيل بوضوح
          hasAdjustments &&
            React.createElement(
              View,
              { style: styles.adjustmentsBlock },
              hasReturns &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, { style: styles.totalsLabel }, "إجمالي المرتجعات"),
                  React.createElement(Text, { style: styles.totalsValue }, `- ${money(balance.total_returns)}`),
                ),
              hasReturns &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, { style: styles.totalsLabel }, "المبلغ الحالي بعد المرتجعات"),
                  React.createElement(Text, { style: styles.totalsValue }, money(balance.current_amount_gross)),
                ),
              hasPayments &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, { style: styles.totalsLabel }, "إجمالي المدفوع"),
                  React.createElement(Text, { style: styles.totalsValue }, `- ${money(balance.total_payments)}`),
                ),
              React.createElement(
                View,
                { style: styles.outstandingRow },
                React.createElement(Text, { style: styles.outstandingLabel }, "المتبقي"),
                React.createElement(Text, { style: styles.outstandingValue }, money(balance.outstanding_amount)),
              ),
            ),
        ),
      ),

      // ===== رمز QR — في أسفل الفاتورة =====
      qrDataUrl &&
        React.createElement(
          View,
          { style: styles.qrBlock },
          React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
        ),
    ),
  );
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  ensureFontsRegistered();
  const qrDataUrl = await buildQrImage(input.invoice.qr_code_payload);
  const doc = InvoiceDocument(input, qrDataUrl);
  return renderToBuffer(doc as React.ReactElement);
}
