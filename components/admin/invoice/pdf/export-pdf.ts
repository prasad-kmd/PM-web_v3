"use client";

import {
  computeInvoiceTotals,
  type InvoiceInput,
  type InvoiceSettings,
} from "@/lib/invoices/types";

/**
 * Converts any logo URL (including `.svg` or WebP) into a PNG data URI on the
 * client so `@react-pdf/renderer`'s `<Image>` never fails on SVG/WebP sources.
 */
async function rasterizeLogoForPdf(logoUrl: string): Promise<string | null> {
  const trimmed = logoUrl.trim();
  if (!trimmed || typeof window === "undefined") return null;
  if (
    trimmed.startsWith("data:image/png;base64,") ||
    trimmed.startsWith("data:image/jpeg;base64,")
  ) {
    return trimmed;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = window.setTimeout(() => resolve(null), 2500);
    img.onload = () => {
      window.clearTimeout(timeout);
      try {
        const size = 192;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        const scale = Math.min(
          size / (img.naturalWidth || size),
          size / (img.naturalHeight || size),
        );
        const drawW = (img.naturalWidth || size) * scale;
        const drawH = (img.naturalHeight || size) * scale;
        ctx.drawImage(
          img,
          (size - drawW) / 2,
          (size - drawH) / 2,
          drawW,
          drawH,
        );
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    img.src = trimmed;
  });
}

export async function generateClientInvoicePdfBlob(
  invoice: InvoiceInput,
  settings: InvoiceSettings,
): Promise<Blob> {
  const [{ pdf }, { InvoicePdfDocument, ensurePdfFontsRegistered }, logoUri] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./invoice-pdf"),
      rasterizeLogoForPdf(settings.logoUrl),
    ]);

  ensurePdfFontsRegistered();

  const totals = computeInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.discountType,
    invoice.discountValue,
    invoice.currency,
  );

  const doc = InvoicePdfDocument({
    invoice: {
      ...invoice,
      ...totals,
    },
    settings,
    resolvedLogoDataUri: logoUri,
  });

  return pdf(doc).toBlob();
}

export async function downloadClientInvoicePdf(
  invoice: InvoiceInput,
  settings: InvoiceSettings,
): Promise<void> {
  const blob = await generateClientInvoicePdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  const safeNum =
    invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]+/g, "-") || "invoice";
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${safeNum}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function previewClientInvoicePdfInTab(
  invoice: InvoiceInput,
  settings: InvoiceSettings,
): Promise<void> {
  const blob = await generateClientInvoicePdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
