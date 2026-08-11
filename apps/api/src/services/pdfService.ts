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

const styles = StyleSheet.create({
  page: { fontFamily: "Cairo", direction: "rtl", padding: 32, fontSize: 10, color: "#1f2937" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  companyBlock: { maxWidth: "60%" },
  companyName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  metaBlock: { alignItems: "flex-end" },
  invoiceTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  small: { fontSize: 9, color: "#4b5563", marginBottom: 2 },
  qrImage: { width: 90, height: 90, marginBottom: 6 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  card: { border: "1px solid #e5e7eb", borderRadius: 4, padding: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  table: { border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottom: "1px solid #e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: { fontWeight: "bold", fontSize: 9 },
  td: { fontSize: 9 },
  colProduct: { flexGrow: 1, flexBasis: 0 },
  colNum: { width: 60, textAlign: "center" },
  totalsBlock: { marginTop: 14, alignItems: "flex-end" },
  totalsCard: { width: 220, border: "1px solid #e5e7eb", borderRadius: 4, padding: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalsRowBold: { flexDirection: "row", justifyContent: "space-between", fontWeight: "bold", fontSize: 11 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  due: "آجلة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

function money(value: number) {
  return `${value.toFixed(2)} ر.س`;
}

// خوارزمية bidi تعكس بصرياً ترتيب المقاطع الرقمية المفصولة بشرطة (مثل تاريخ
// ISO "2026-08-11") داخل سياق RTL لأن الشرطة حرف محايد بين أرقام "ضعيفة" الاتجاه.
// علامات يونيكود LRI/PDI غير موجودة في خط Cairo المُضمَّن، فنستخدم بدلاً منها
// Text متداخل بخاصية direction: "ltr" ليبقى المقطع بصرياً كما هو دون قلب.
function LtrSpan(value: string) {
  return React.createElement(Text, { style: { direction: "ltr" } }, value);
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
    return await QRCode.toDataURL(payload, { margin: 1, width: 300 });
  } catch {
    return null;
  }
}

function InvoiceDocument({ company, customer, invoice, items, balance }: InvoicePdfInput, qrDataUrl: string | null) {
  const hasReturns = balance.total_returns > 0;
  const hasPayments = balance.total_payments > 0;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          View,
          { style: styles.companyBlock },
          React.createElement(Text, { style: styles.companyName }, company.name),
          company.vat_number &&
            React.createElement(Text, { style: styles.small }, `الرقم الضريبي: ${company.vat_number}`),
          company.cr_number &&
            React.createElement(Text, { style: styles.small }, `السجل التجاري: ${company.cr_number}`),
          company.phone && React.createElement(Text, { style: styles.small }, `الجوال: ${company.phone}`),
          company.email && React.createElement(Text, { style: styles.small }, `البريد: ${company.email}`),
          company.address && React.createElement(Text, { style: styles.small }, company.address),
        ),
        React.createElement(
          View,
          { style: styles.metaBlock },
          qrDataUrl && React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
          React.createElement(
            Text,
            { style: styles.invoiceTitle },
            invoice.invoice_type === "simplified" ? "فاتورة ضريبية مبسّطة" : "فاتورة ضريبية",
          ),
          React.createElement(Text, { style: styles.small }, `رقم الفاتورة: ${invoice.invoice_number ?? "—"}`),
          React.createElement(
            Text,
            { style: styles.small },
            "تاريخ الفاتورة: ",
            LtrSpan(invoice.invoice_date),
          ),
          invoice.due_date &&
            React.createElement(
              Text,
              { style: styles.small },
              "تاريخ الاستحقاق: ",
              LtrSpan(invoice.due_date),
            ),
          invoice.issued_at &&
            React.createElement(
              Text,
              { style: styles.small },
              "وقت الإصدار: ",
              LtrSpan(invoice.issued_at),
            ),
          React.createElement(
            Text,
            { style: styles.small },
            `الحالة: ${STATUS_LABELS[invoice.status] ?? invoice.status}`,
          ),
        ),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "بيانات العميل"),
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(Text, { style: styles.small }, customer.name),
          customer.vat_number &&
            React.createElement(Text, { style: styles.small }, `الرقم الضريبي: ${customer.vat_number}`),
          customer.cr_number &&
            React.createElement(Text, { style: styles.small }, `السجل التجاري: ${customer.cr_number}`),
          customer.phone && React.createElement(Text, { style: styles.small }, `الجوال: ${customer.phone}`),
          customer.address && React.createElement(Text, { style: styles.small }, customer.address),
        ),
      ),

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
        ...items.map((item) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: item.id },
            React.createElement(Text, { style: [styles.td, styles.colProduct] }, item.product_name_snapshot),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, String(item.quantity)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.unit_price.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_net.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_vat.toFixed(2)),
            React.createElement(Text, { style: [styles.td, styles.colNum] }, item.line_gross.toFixed(2)),
          ),
        ),
      ),

      React.createElement(
        View,
        { style: styles.totalsBlock },
        React.createElement(
          View,
          { style: styles.totalsCard },
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, "الإجمالي قبل الضريبة"),
            React.createElement(Text, null, money(invoice.original_amount_net)),
          ),
          React.createElement(
            View,
            { style: styles.totalsRow },
            React.createElement(Text, null, "إجمالي الضريبة"),
            React.createElement(Text, null, money(invoice.original_vat_amount)),
          ),
          React.createElement(
            View,
            { style: styles.totalsRowBold },
            React.createElement(Text, null, "الإجمالي شامل الضريبة"),
            React.createElement(Text, null, money(invoice.original_amount_gross)),
          ),

          // القسم 14: إن تأثرت الفاتورة بمرتجع أو دفعة، تُعرض التفاصيل بوضوح
          (hasReturns || hasPayments) &&
            React.createElement(
              View,
              { style: { marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" } },
              hasReturns &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, null, "إجمالي المرتجعات"),
                  React.createElement(Text, null, `- ${money(balance.total_returns)}`),
                ),
              hasReturns &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, null, "المبلغ الحالي بعد المرتجعات"),
                  React.createElement(Text, null, money(balance.current_amount_gross)),
                ),
              hasPayments &&
                React.createElement(
                  View,
                  { style: styles.totalsRow },
                  React.createElement(Text, null, "إجمالي المدفوع"),
                  React.createElement(Text, null, money(balance.total_payments)),
                ),
              React.createElement(
                View,
                { style: styles.totalsRowBold },
                React.createElement(Text, null, "المتبقي"),
                React.createElement(Text, null, money(balance.outstanding_amount)),
              ),
            ),
        ),
      ),

      React.createElement(
        Text,
        { style: styles.footer },
        "فاتورة متوافقة مع المرحلة الأولى (Phase 1) من نظام الفوترة الإلكترونية السعودي — ZATCA",
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
