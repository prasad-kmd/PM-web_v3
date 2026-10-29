import { z } from "zod";

export const INVOICE_CURRENCIES = [
  "LKR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "JPY",
] as const;

export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number];

export const CURRENCY_META: Record<
  InvoiceCurrency,
  { symbol: string; label: string; decimals: number }
> = {
  LKR: { symbol: "Rs.", label: "LKR — Sri Lankan Rupee", decimals: 2 },
  USD: { symbol: "$", label: "USD — US Dollar", decimals: 2 },
  EUR: { symbol: "€", label: "EUR — Euro", decimals: 2 },
  GBP: { symbol: "£", label: "GBP — British Pound", decimals: 2 },
  AUD: { symbol: "A$", label: "AUD — Australian Dollar", decimals: 2 },
  CAD: { symbol: "C$", label: "CAD — Canadian Dollar", decimals: 2 },
  JPY: { symbol: "¥", label: "JPY — Japanese Yen", decimals: 0 },
};

export const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Paid",
  "Overdue",
  "Cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const DISCOUNT_TYPES = ["fixed", "percent"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const InvoiceLineItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().min(0).max(1_000_000),
  unitPrice: z.number().min(0).max(1_000_000_000),
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceClientSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(160).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(80).default(""),
  address: z.string().trim().max(500).default(""),
});

export type InvoiceClientSnapshot = z.infer<typeof InvoiceClientSnapshotSchema>;

export const InvoiceInputSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(64),
  status: z.enum(INVOICE_STATUSES).default("Draft"),
  issueDate: z.string().trim().min(4).max(32),
  dueDate: z.string().trim().max(32).default(""),
  paidDate: z.string().trim().max(32).default(""),
  currency: z.enum(INVOICE_CURRENCIES).default("LKR"),
  clientId: z.string().trim().max(120).default(""),
  client: InvoiceClientSnapshotSchema,
  items: z.array(InvoiceLineItemSchema).min(1).max(100),
  taxRate: z.number().min(0).max(100).default(0),
  discountType: z.enum(DISCOUNT_TYPES).default("fixed"),
  discountValue: z.number().min(0).max(1_000_000_000).default(0),
  notes: z.string().trim().max(2000).default(""),
  paymentTerms: z.string().trim().max(2000).default(""),
});

export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;

export type InvoiceRecord = InvoiceInput & {
  id: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export const ClientInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(160).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(80).default(""),
  address: z.string().trim().max(500).default(""),
  defaultCurrency: z.enum(INVOICE_CURRENCIES).default("LKR"),
  notes: z.string().trim().max(1000).default(""),
});

export type ClientInput = z.infer<typeof ClientInputSchema>;

export type ClientRecord = ClientInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export const InvoiceSettingsSchema = z.object({
  businessName: z.string().trim().min(1).max(160).default("Prasad Madhuranga"),
  tagline: z
    .string()
    .trim()
    .max(160)
    .default("Mechanical & Mechatronics Engineering"),
  email: z.string().trim().max(160).default("contact@pmengineer.lk"),
  phone: z.string().trim().max(80).default(""),
  website: z.string().trim().max(160).default("https://pmengineer.lk"),
  address: z
    .string()
    .trim()
    .max(400)
    .default("Kandy, Central Province, Sri Lanka"),
  logoUrl: z.string().trim().max(500_000).default("/favicon-pm.svg"),
  invoicePrefix: z.string().trim().min(1).max(20).default("INV-"),
  invoicePadding: z.number().int().min(2).max(8).default(4),
  defaultCurrency: z.enum(INVOICE_CURRENCIES).default("LKR"),
  defaultTaxRate: z.number().min(0).max(100).default(0),
  defaultPaymentTerms: z
    .string()
    .trim()
    .max(2000)
    .default("Payment due within 14 days of issue via bank transfer."),
  defaultNotes: z
    .string()
    .trim()
    .max(2000)
    .default("Thank you for your collaboration."),
});

export type InvoiceSettings = z.infer<typeof InvoiceSettingsSchema>;

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings =
  InvoiceSettingsSchema.parse({});

export function roundMoney(
  value: number,
  currency: InvoiceCurrency = "LKR",
): number {
  const decimals = CURRENCY_META[currency]?.decimals ?? 2;
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function computeInvoiceTotals(
  items: InvoiceLineItem[],
  taxRate: number,
  discountType: DiscountType,
  discountValue: number,
  currency: InvoiceCurrency = "LKR",
) {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) => sum + roundMoney(item.quantity * item.unitPrice, currency),
      0,
    ),
    currency,
  );

  const rawDiscount =
    discountType === "percent"
      ? subtotal * (Math.min(Math.max(discountValue, 0), 100) / 100)
      : Math.max(discountValue, 0);
  const discountAmount = roundMoney(Math.min(rawDiscount, subtotal), currency);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = roundMoney(
    taxableBase * (Math.min(Math.max(taxRate, 0), 100) / 100),
    currency,
  );
  const total = roundMoney(taxableBase + taxAmount, currency);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
  };
}

export function formatInvoiceMoney(
  amount: number,
  currency: InvoiceCurrency = "LKR",
): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.LKR;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(Number.isFinite(amount) ? amount : 0);
  return `${meta.symbol} ${formatted}`;
}

export function formatNextInvoiceNumber(
  existingNumbers: string[],
  prefix: string,
  padding: number,
): string {
  const cleanPrefix = prefix || "INV-";
  let maxSeq = 0;
  for (const raw of existingNumbers) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(cleanPrefix)) {
      const tail = trimmed.slice(cleanPrefix.length).replace(/\D/g, "");
      const num = Number.parseInt(tail, 10);
      if (Number.isFinite(num) && num > maxSeq) maxSeq = num;
    } else {
      const match = /(\d+)$/.exec(trimmed);
      if (match) {
        const num = Number.parseInt(match[1], 10);
        if (Number.isFinite(num) && num > maxSeq) maxSeq = num;
      }
    }
  }
  return `${cleanPrefix}${String(maxSeq + 1).padStart(padding, "0")}`;
}

export function deriveEffectiveStatus(
  status: InvoiceStatus,
  dueDate: string,
): InvoiceStatus {
  if (status !== "Sent" || !dueDate) return status;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today ? "Overdue" : status;
}
