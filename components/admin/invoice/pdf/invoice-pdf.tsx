"use client";

import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  CURRENCY_META,
  formatInvoiceMoney,
  roundMoney,
  type InvoiceCurrency,
  type InvoiceInput,
  type InvoiceSettings,
  type InvoiceStatus,
} from "@/lib/invoices/types";

let fontsRegistered = false;

export function ensurePdfFontsRegistered() {
  if (fontsRegistered || typeof window === "undefined") return;
  const origin = window.location.origin;
  Font.register({
    family: "Outfit",
    fonts: [
      { src: `${origin}/og/outfit-400.woff`, fontWeight: 400 },
      { src: `${origin}/og/outfit-500.woff`, fontWeight: 500 },
      { src: `${origin}/og/outfit-600.woff`, fontWeight: 600 },
      { src: `${origin}/og/outfit-600.woff`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const COLORS = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  zebra: "#f8fafc",
  accent: "#0067c0",
};

function statusBadgePalette(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
      return { bg: "#dcfce7", fg: "#166534" };
    case "Sent":
      return { bg: "#e0f2fe", fg: "#075985" };
    case "Overdue":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "Cancelled":
      return { bg: "#f1f5f9", fg: "#64748b" };
    default:
      return { bg: "#f1f5f9", fg: "#334155" };
  }
}

function formatReadableDate(iso: string): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Outfit",
    fontSize: 9.5,
    color: COLORS.body,
    backgroundColor: "#ffffff",
    paddingTop: 38,
    paddingHorizontal: 40,
    paddingBottom: 68,
  },
  topAccentBar: {
    height: 3,
    width: 72,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  businessCol: {
    maxWidth: "56%",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  logoImg: {
    width: 34,
    height: 34,
    borderRadius: 6,
    marginRight: 10,
    objectFit: "contain",
  },
  businessName: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.ink,
    lineHeight: 1.2,
  },
  businessTagline: {
    fontSize: 8.5,
    fontWeight: 500,
    color: COLORS.accent,
    marginTop: 1,
  },
  businessMeta: {
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.45,
    marginTop: 4,
  },
  invoiceMetaCol: {
    alignItems: "flex-end",
  },
  invoiceHeading: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.ink,
    letterSpacing: 1.2,
  },
  invoiceNum: {
    fontSize: 10.5,
    fontWeight: 600,
    color: COLORS.ink,
    marginTop: 2,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8.5,
    color: COLORS.muted,
    marginRight: 6,
  },
  metaValue: {
    fontSize: 8.5,
    fontWeight: 600,
    color: COLORS.ink,
  },
  badge: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  billToBox: {
    width: "58%",
    padding: 12,
    backgroundColor: COLORS.zebra,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHighlightBox: {
    width: "38%",
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.ink,
  },
  clientCompany: {
    fontSize: 9.5,
    fontWeight: 500,
    color: COLORS.body,
    marginTop: 1,
  },
  clientDetail: {
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.45,
    marginTop: 3,
  },
  amountDueValue: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.ink,
    marginTop: 2,
  },
  amountDueSub: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 3,
  },
  table: {
    width: "100%",
    marginBottom: 18,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.ink,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeadText: {
    fontSize: 8,
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableRowZebra: {
    backgroundColor: COLORS.zebra,
  },
  colIdx: { width: "7%" },
  colDesc: { width: "49%", paddingRight: 8 },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colAmt: { width: "16%", textAlign: "right" },
  cellText: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.35,
  },
  cellStrong: {
    fontSize: 9,
    fontWeight: 600,
    color: COLORS.ink,
  },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 22,
  },
  totalsCard: {
    width: 235,
    paddingTop: 4,
  },
  totalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  totalsVal: {
    fontSize: 9,
    fontWeight: 600,
    color: COLORS.ink,
  },
  grandTotalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 4,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.ink,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.ink,
  },
  grandTotalVal: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.accent,
  },
  notesTermsGrid: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesCol: {
    flex: 1,
  },
  notesBody: {
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 9,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    fontSize: 7.5,
    color: COLORS.faint,
  },
  footerLink: {
    color: COLORS.muted,
    textDecoration: "none",
  },
  footerPage: {
    fontSize: 7.5,
    color: COLORS.faint,
  },
});

export type InvoicePdfDocumentProps = {
  invoice: InvoiceInput & {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
  };
  settings: InvoiceSettings;
  resolvedLogoDataUri?: string | null;
};

export function InvoicePdfDocument({
  invoice,
  settings,
  resolvedLogoDataUri,
}: InvoicePdfDocumentProps) {
  const badge = statusBadgePalette(invoice.status);
  const currency: InvoiceCurrency = invoice.currency;
  const currencyLabel =
    CURRENCY_META[currency]?.label.split("—")[0]?.trim() || currency;
  const cleanSiteLabel = settings.website
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const siteHref = settings.website.startsWith("http")
    ? settings.website
    : settings.website
      ? `https://${settings.website}`
      : "";

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={settings.businessName}
      subject={`Invoice ${invoice.invoiceNumber} for ${invoice.client.name}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.businessCol}>
            <View style={styles.logoRow}>
              {resolvedLogoDataUri ? (
                <Image src={resolvedLogoDataUri} style={styles.logoImg} />
              ) : null}
              <View>
                <Text style={styles.businessName}>{settings.businessName}</Text>
                {settings.tagline ? (
                  <Text style={styles.businessTagline}>{settings.tagline}</Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.businessMeta}>
              {[
                settings.address,
                [settings.phone, settings.email].filter(Boolean).join(" · "),
                cleanSiteLabel,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>

          <View style={styles.invoiceMetaCol}>
            <Text style={styles.invoiceHeading}>INVOICE</Text>
            <Text style={styles.invoiceNum}>#{invoice.invoiceNumber}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued:</Text>
              <Text style={styles.metaValue}>
                {formatReadableDate(invoice.issueDate)}
              </Text>
            </View>
            {invoice.dueDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due:</Text>
                <Text style={styles.metaValue}>
                  {formatReadableDate(invoice.dueDate)}
                </Text>
              </View>
            ) : null}
            {invoice.paidDate && invoice.status === "Paid" ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Paid:</Text>
                <Text style={styles.metaValue}>
                  {formatReadableDate(invoice.paidDate)}
                </Text>
              </View>
            ) : null}

            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To + Summary Highlight */}
        <View style={styles.partiesRow}>
          <View style={styles.billToBox}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.client.name}</Text>
            {invoice.client.company ? (
              <Text style={styles.clientCompany}>{invoice.client.company}</Text>
            ) : null}
            <Text style={styles.clientDetail}>
              {[
                invoice.client.address,
                [invoice.client.email, invoice.client.phone]
                  .filter(Boolean)
                  .join(" · "),
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>

          <View style={styles.summaryHighlightBox}>
            <Text style={styles.sectionLabel}>
              {invoice.status === "Paid" ? "Total Paid" : "Amount Due"} (
              {currencyLabel})
            </Text>
            <Text style={styles.amountDueValue}>
              {formatInvoiceMoney(invoice.total, currency)}
            </Text>
            <Text style={styles.amountDueSub}>
              {invoice.dueDate
                ? `Due ${formatReadableDate(invoice.dueDate)}`
                : `Issued ${formatReadableDate(invoice.issueDate)}`}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.tableHeadText, styles.colIdx]}>#</Text>
            <Text style={[styles.tableHeadText, styles.colDesc]}>
              Description
            </Text>
            <Text style={[styles.tableHeadText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeadText, styles.colRate]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeadText, styles.colAmt]}>Amount</Text>
          </View>

          {invoice.items.map((item, idx) => {
            const lineTotal = roundMoney(
              item.quantity * item.unitPrice,
              currency,
            );
            return (
              <View
                key={item.id || idx}
                wrap={false}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowZebra : {},
                ]}
              >
                <Text style={[styles.cellText, styles.colIdx]}>{idx + 1}</Text>
                <Text style={[styles.cellText, styles.colDesc]}>
                  {item.description}
                </Text>
                <Text style={[styles.cellText, styles.colQty]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.cellText, styles.colRate]}>
                  {formatInvoiceMoney(item.unitPrice, currency)}
                </Text>
                <Text style={[styles.cellStrong, styles.colAmt]}>
                  {formatInvoiceMoney(lineTotal, currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap} wrap={false}>
          <View style={styles.totalsCard}>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsVal}>
                {formatInvoiceMoney(invoice.subtotal, currency)}
              </Text>
            </View>

            {invoice.discountAmount > 0 && (
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>
                  Discount
                  {invoice.discountType === "percent"
                    ? ` (${invoice.discountValue}%)`
                    : ""}
                </Text>
                <Text style={styles.totalsVal}>
                  -{formatInvoiceMoney(invoice.discountAmount, currency)}
                </Text>
              </View>
            )}

            {invoice.taxRate > 0 && (
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={styles.totalsVal}>
                  {formatInvoiceMoney(invoice.taxAmount, currency)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalLine}>
              <Text style={styles.grandTotalLabel}>Total ({currency})</Text>
              <Text style={styles.grandTotalVal}>
                {formatInvoiceMoney(invoice.total, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes + Payment Terms */}
        {(invoice.notes || invoice.paymentTerms) && (
          <View style={styles.notesTermsGrid} wrap={false}>
            {invoice.notes ? (
              <View style={styles.notesCol}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.notesBody}>{invoice.notes}</Text>
              </View>
            ) : null}

            {invoice.paymentTerms ? (
              <View style={styles.notesCol}>
                <Text style={styles.sectionLabel}>Payment Details & Terms</Text>
                <Text style={styles.notesBody}>{invoice.paymentTerms}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Fixed Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            Computer-generated invoice — no signature required.
            {siteHref ? " · " : ""}
            {siteHref ? (
              <Link src={siteHref} style={styles.footerLink}>
                {cleanSiteLabel}
              </Link>
            ) : null}
          </Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
