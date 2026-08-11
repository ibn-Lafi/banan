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

// لوحة ألوان مطابقة لهوية الواجهة (apps/web/tailwind.config.ts -> brand)
const BRAND = "#0a7e58";
const BRAND_DARK = "#086346";
const BRAND_LIGHT = "#eefaf3";
const INK = "#111827";
const GRAY = "#6b7280";
const GRAY_LIGHT = "#9ca3af";
const BORDER = "#e5e7eb";
const ROW_ALT = "#f9fafb";

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "مسودة", bg: "#f3f4f6", text: "#374151" },
  issued: { label: "صادرة", bg: "#eff6ff", text: "#1d4ed8" },
  due: { label: "آجلة", bg: "#eff6ff", text: "#1d4ed8" },
  partially_paid: { label: "مدفوعة جزئياً", bg: "#fffbeb", text: "#b45309" },
  paid: { label: "مدفوعة", bg: BRAND_LIGHT, text: BRAND_DARK },
  overdue: { label: "متأخرة", bg: "#fef2f2", text: "#b91c1c" },
  cancelled: { label: "ملغاة", bg: "#f3f4f6", text: "#6b7280" },
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    direction: "rtl",
    fontSize: 10,
    color: INK,
    paddingTop: 0,
    paddingBottom: 54,
    paddingHorizontal: 0,
  },
  accentBar: { height: 8, backgroundColor: BRAND },
  content: { paddingHorizontal: 36, paddingTop: 28 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  companyBlock: { maxWidth: "58%" },
  companyName: { fontSize: 17, fontWeight: "bold", color: INK, marginBottom: 6 },
  metaLine: { fontSize: 9, color: GRAY, marginBottom: 2, lineHeight: 1.5 },

  metaBlock: { alignItems: "flex-end" },
  invoiceKicker: { fontSize: 9, fontWeight: "bold", color: BRAND, marginBottom: 3, letterSpacing: 0.5 },
  invoiceNumber: { fontSize: 18, fontWeight: "bold", color: INK, marginBottom: 8 },
  statusPill: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 10 },
  statusPillText: { fontSize: 8, fontWeight: "bold" },
  qrImage: { width: 78, height: 78, marginBottom: 4 },
  qrCaption: { fontSize: 7, color: GRAY_LIGHT },

  divider: { borderBottom: `1px solid ${BORDER}`, marginBottom: 20 },

  metaGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  metaGridCol: { width: "31%" },
  metaGridLabel: { fontSize: 8, color: GRAY_LIGHT, marginBottom: 3 },
  metaGridValue: { fontSize: 10, fontWeight: "bold", color: INK },

  billToLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: BRAND_DARK,
    backgroundColor: BRAND_LIGHT,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 8,
  },
  customerCard: { border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12, marginBottom: 20 },
  customerName: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  customerLine: { fontSize: 9, color: GRAY, marginBottom: 2 },

  table: { border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden", marginBottom: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: BRAND, paddingVertical: 8, paddingHorizontal: 10 },
  tableRow: {
    flexDirection: "row",
    borderTop: `1px solid ${BORDER}`,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  th: { fontWeight: "bold", fontSize: 8.5, color: "#ffffff" },
  td: { fontSize: 9, color: INK },
  tdMuted: { fontSize: 8, color: GRAY_LIGHT, marginTop: 1 },
  colProduct: { flexGrow: 2.6, flexBasis: 0, paddingLeft: 6 },
  colNum: { flexGrow: 1, flexBasis: 0, textAlign: "center" },

  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  notesBlock: { maxWidth: "45%", justifyContent: "flex-end" },
  notesText: { fontSize: 8, color: GRAY_LIGHT, lineHeight: 1.5 },

  totalsCard: { width: 230, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 14 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalsLabel: { fontSize: 9, color: GRAY },
  totalsValue: { fontSize: 9, color: INK },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: "bold", color: "#ffffff" },
  grandTotalValue: { fontSize: 12, fontWeight: "bold", color: "#ffffff" },

  adjustmentsBlock: { marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${BORDER}` },
  outstandingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTop: `1px solid ${BORDER}`,
  },
  outstandingLabel: { fontSize: 10, fontWeight: "bold", color: INK },
  outstandingValue: { fontSize: 12, fontWeight: "bold", color: BRAND_DARK },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderTop: `1px solid ${BORDER}`,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: GRAY_LIGHT },
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

function StatusPill(status: string) {
  const meta = STATUS_META[status] ?? { label: status, bg: "#f3f4f6", text: "#374151" };
  return React.createElement(
    View,
    { style: [styles.statusPill, { backgroundColor: meta.bg }] },
    React.createElement(Text, { style: [styles.statusPillText, { color: meta.text }] }, meta.label),
  );
}

function InvoiceDocument({ company, customer, invoice, items, balance }: InvoicePdfInput, qrDataUrl: string | null) {
  const hasReturns = balance.total_returns > 0;
  const hasPayments = balance.total_payments > 0;
  const hasAdjustments = hasReturns || hasPayments;

  const companyMeta = [
    company.vat_number && `الرقم الضريبي: ${company.vat_number}`,
    company.cr_number && `السجل التجاري: ${company.cr_number}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  const companyContact = [company.phone, company.email].filter(Boolean).join("   |   ");

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(View, { style: styles.accentBar }),
      React.createElement(
        View,
        { style: styles.content },

        // رأس الفاتورة: بيانات الشركة يمين، عنوان الفاتورة ورقمها وحالتها ورمز QR يسار
        React.createElement(
          View,
          { style: styles.headerRow },
          React.createElement(
            View,
            { style: styles.companyBlock },
            React.createElement(Text, { style: styles.companyName }, company.name),
            companyMeta && React.createElement(Text, { style: styles.metaLine }, companyMeta),
            companyContact && React.createElement(Text, { style: styles.metaLine }, companyContact),
            company.address && React.createElement(Text, { style: styles.metaLine }, company.address),
          ),
          React.createElement(
            View,
            { style: styles.metaBlock },
            qrDataUrl &&
              React.createElement(
                View,
                { style: { alignItems: "center" } },
                React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
                React.createElement(Text, { style: styles.qrCaption }, "رمز التحقق الإلكتروني"),
              ),
          ),
        ),

        React.createElement(
          View,
          { style: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 } },
          React.createElement(
            View,
            null,
            React.createElement(
              Text,
              { style: styles.invoiceKicker },
              invoice.invoice_type === "simplified" ? "فاتورة ضريبية مبسّطة" : "فاتورة ضريبية",
            ),
            React.createElement(Text, { style: styles.invoiceNumber }, invoice.invoice_number ?? "—"),
          ),
          StatusPill(invoice.status),
        ),

        React.createElement(View, { style: styles.divider }),

        // شبكة تواريخ الفاتورة
        React.createElement(
          View,
          { style: styles.metaGrid },
          React.createElement(
            View,
            { style: styles.metaGridCol },
            React.createElement(Text, { style: styles.metaGridLabel }, "تاريخ الفاتورة"),
            LtrSpan(invoice.invoice_date, styles.metaGridValue),
          ),
          invoice.due_date &&
            React.createElement(
              View,
              { style: styles.metaGridCol },
              React.createElement(Text, { style: styles.metaGridLabel }, "تاريخ الاستحقاق"),
              LtrSpan(invoice.due_date, styles.metaGridValue),
            ),
          invoice.issued_at &&
            React.createElement(
              View,
              { style: styles.metaGridCol },
              React.createElement(Text, { style: styles.metaGridLabel }, "وقت الإصدار"),
              LtrSpan(invoice.issued_at, { ...styles.metaGridValue, fontSize: 8.5 }),
            ),
        ),

        // بيانات العميل
        React.createElement(Text, { style: styles.billToLabel }, "فوترة إلى"),
        React.createElement(
          View,
          { style: styles.customerCard },
          React.createElement(Text, { style: styles.customerName }, customer.name),
          customer.vat_number &&
            React.createElement(Text, { style: styles.customerLine }, `الرقم الضريبي: ${customer.vat_number}`),
          customer.cr_number &&
            React.createElement(Text, { style: styles.customerLine }, `السجل التجاري: ${customer.cr_number}`),
          customer.phone && React.createElement(Text, { style: styles.customerLine }, `الجوال: ${customer.phone}`),
          customer.address && React.createElement(Text, { style: styles.customerLine }, customer.address),
        ),

        // جدول البنود
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHeaderRow },
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
        ),

        // الإجماليات
        React.createElement(
          View,
          { style: styles.totalsWrap },
          React.createElement(
            View,
            { style: styles.notesBlock },
            React.createElement(
              Text,
              { style: styles.notesText },
              "فاتورة متوافقة مع المرحلة الأولى (Phase 1) من نظام الفوترة الإلكترونية السعودي — ZATCA. تُصدَر هذه الوثيقة إلكترونياً ولا تتطلب توقيعاً أو ختماً.",
            ),
          ),
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
              { style: styles.totalsRow },
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
                    React.createElement(Text, { style: [styles.totalsValue, { color: "#b91c1c" }] }, `- ${money(balance.total_returns)}`),
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
                    React.createElement(Text, { style: [styles.totalsValue, { color: BRAND_DARK }] }, money(balance.total_payments)),
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
      ),

      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, company.name),
        React.createElement(
          Text,
          { style: styles.footerText, render: ({ pageNumber, totalPages }) => `صفحة ${pageNumber} من ${totalPages}` },
        ),
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
