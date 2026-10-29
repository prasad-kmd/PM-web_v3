"use client";

import {
  computeInvoiceTotals,
  formatInvoiceMoney,
  roundMoney,
  type InvoiceInput,
  type InvoiceSettings,
} from "@/lib/invoices/types";

/**
 * Crisp live A4 paper sheet rendered on the right half of `01 · Split ledger studio`,
 * mirroring the client-side `@react-pdf/renderer` document layout in real time.
 */
export function InvoicePaperPreview({
  invoice,
  settings,
}: {
  invoice: InvoiceInput;
  settings: InvoiceSettings;
}) {
  const totals = computeInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.discountType,
    invoice.discountValue,
    invoice.currency,
  );

  const cleanWebsite = settings.website
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return (
    <article
      className="invoice-paper-sheet"
      aria-label="Live A4 invoice preview"
    >
      <div className="invoice-paper-accent" />

      <header className="invoice-paper-head">
        <div className="invoice-paper-brand">
          <div className="invoice-paper-logo-row">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt=""
                className="invoice-paper-logo"
              />
            )}
            <div>
              <h3 className="invoice-paper-bname">
                {settings.businessName || "Prasad Madhuranga"}
              </h3>
              {settings.tagline && (
                <p className="invoice-paper-tagline">{settings.tagline}</p>
              )}
            </div>
          </div>
          <div className="invoice-paper-bmeta">
            {settings.address && <p>{settings.address}</p>}
            {(settings.phone || settings.email) && (
              <p>
                {[settings.phone, settings.email].filter(Boolean).join(" · ")}
              </p>
            )}
            {cleanWebsite && <p>{cleanWebsite}</p>}
          </div>
        </div>

        <div className="invoice-paper-docmeta">
          <span className="invoice-paper-wordmark">INVOICE</span>
          <strong className="invoice-paper-num tabular-nums">
            #{invoice.invoiceNumber || "INV-0001"}
          </strong>
          <div className="invoice-paper-dates tabular-nums">
            <div>
              <span>Issued:</span> <strong>{invoice.issueDate || "—"}</strong>
            </div>
            {invoice.dueDate && (
              <div>
                <span>Due:</span> <strong>{invoice.dueDate}</strong>
              </div>
            )}
          </div>
          <span
            className={`invoice-status-pill is-${invoice.status.toLowerCase()}`}
          >
            {invoice.status}
          </span>
        </div>
      </header>

      <div className="invoice-paper-parties">
        <div className="invoice-paper-billto">
          <span className="invoice-paper-kicker">Bill To</span>
          <strong>{invoice.client.name || "Client Name"}</strong>
          {invoice.client.company && (
            <span className="invoice-paper-company">
              {invoice.client.company}
            </span>
          )}
          {invoice.client.address && (
            <p className="whitespace-pre-line">{invoice.client.address}</p>
          )}
          {(invoice.client.email || invoice.client.phone) && (
            <p>
              {[invoice.client.email, invoice.client.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="invoice-paper-duecard tabular-nums">
          <span className="invoice-paper-kicker">
            {invoice.status === "Paid" ? "Total Paid" : "Amount Due"} (
            {invoice.currency})
          </span>
          <strong>{formatInvoiceMoney(totals.total, invoice.currency)}</strong>
          <small>
            {invoice.dueDate
              ? `Due ${invoice.dueDate}`
              : `Issued ${invoice.issueDate || "today"}`}
          </small>
        </div>
      </div>

      <table className="invoice-paper-table tabular-nums">
        <thead>
          <tr>
            <th className="w-8 text-left">#</th>
            <th className="text-left">Description</th>
            <th className="w-14 text-right">Qty</th>
            <th className="w-24 text-right">Unit Price</th>
            <th className="w-24 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{idx + 1}</td>
              <td>{item.description || "Line item"}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">
                {formatInvoiceMoney(item.unitPrice, invoice.currency)}
              </td>
              <td className="text-right font-semibold">
                {formatInvoiceMoney(
                  roundMoney(item.quantity * item.unitPrice, invoice.currency),
                  invoice.currency,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-paper-totals-wrap tabular-nums">
        <div className="invoice-paper-totals">
          <div>
            <span>Subtotal</span>
            <strong>
              {formatInvoiceMoney(totals.subtotal, invoice.currency)}
            </strong>
          </div>
          {totals.discountAmount > 0 && (
            <div>
              <span>
                Discount
                {invoice.discountType === "percent"
                  ? ` (${invoice.discountValue}%)`
                  : ""}
              </span>
              <strong>
                -{formatInvoiceMoney(totals.discountAmount, invoice.currency)}
              </strong>
            </div>
          )}
          {invoice.taxRate > 0 && (
            <div>
              <span>Tax ({invoice.taxRate}%)</span>
              <strong>
                {formatInvoiceMoney(totals.taxAmount, invoice.currency)}
              </strong>
            </div>
          )}
          <div className="is-grand">
            <span>Total ({invoice.currency})</span>
            <strong>
              {formatInvoiceMoney(totals.total, invoice.currency)}
            </strong>
          </div>
        </div>
      </div>

      {(invoice.notes || invoice.paymentTerms) && (
        <footer className="invoice-paper-notes">
          {invoice.notes && (
            <div>
              <span className="invoice-paper-kicker">Notes</span>
              <p className="whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
          {invoice.paymentTerms && (
            <div>
              <span className="invoice-paper-kicker">
                Payment Details & Terms
              </span>
              <p className="whitespace-pre-line">{invoice.paymentTerms}</p>
            </div>
          )}
        </footer>
      )}

      <div className="invoice-paper-footline">
        <span>Computer-generated invoice — no signature required.</span>
        <span>{cleanWebsite}</span>
      </div>
    </article>
  );
}
