import "server-only";
import { randomUUID } from "node:crypto";
import { Client } from "@notionhq/client";
import type {
  BlockObjectRequest,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  computeInvoiceTotals,
  DEFAULT_INVOICE_SETTINGS,
  deriveEffectiveStatus,
  formatInvoiceMoney,
  INVOICE_CURRENCIES,
  INVOICE_STATUSES,
  InvoiceSettingsSchema,
  roundMoney,
  type ClientInput,
  type ClientRecord,
  type InvoiceCurrency,
  type InvoiceInput,
  type InvoiceLineItem,
  type InvoiceRecord,
  type InvoiceSettings,
  type InvoiceStatus,
} from "@/lib/invoices/types";

const API_VERSION = "2026-03-11";
const RICH_TEXT_CHUNK = 1850;
const SCHEMA_TTL_MS = 5 * 60_000;

type StorageMode = "cloud" | "session";

type PropertyMap = Record<string, { id: string; type: string }>;

type CachedDataSource = {
  dataSourceId: string;
  titleProp: string;
  properties: PropertyMap;
  expiresAt: number;
};

const dsCache = new Map<string, CachedDataSource>();

/** Session-scoped fallback store when cloud database IDs are not configured yet. */
const memoryState: {
  invoices: InvoiceRecord[];
  clients: ClientRecord[];
  settings: InvoiceSettings | null;
} = {
  invoices: [],
  clients: [],
  settings: null,
};

function getEnvDefaultsForSettings(): InvoiceSettings {
  return InvoiceSettingsSchema.parse({
    businessName:
      process.env.INVOICE_BUSINESS_NAME?.trim() ||
      DEFAULT_INVOICE_SETTINGS.businessName,
    tagline:
      process.env.INVOICE_BUSINESS_TAGLINE?.trim() ||
      DEFAULT_INVOICE_SETTINGS.tagline,
    email:
      process.env.INVOICE_BUSINESS_EMAIL?.trim() ||
      DEFAULT_INVOICE_SETTINGS.email,
    phone:
      process.env.INVOICE_BUSINESS_PHONE?.trim() ||
      DEFAULT_INVOICE_SETTINGS.phone,
    website:
      process.env.INVOICE_BUSINESS_WEBSITE?.trim() ||
      DEFAULT_INVOICE_SETTINGS.website,
    address:
      process.env.INVOICE_BUSINESS_ADDRESS?.trim() ||
      DEFAULT_INVOICE_SETTINGS.address,
    logoUrl:
      process.env.INVOICE_BUSINESS_LOGO?.trim() ||
      DEFAULT_INVOICE_SETTINGS.logoUrl,
    invoicePrefix:
      process.env.INVOICE_PREFIX?.trim() ||
      DEFAULT_INVOICE_SETTINGS.invoicePrefix,
    invoicePadding: Number(process.env.INVOICE_PADDING) || 4,
    defaultCurrency: INVOICE_CURRENCIES.includes(
      process.env.INVOICE_DEFAULT_CURRENCY?.trim() as InvoiceCurrency,
    )
      ? (process.env.INVOICE_DEFAULT_CURRENCY!.trim() as InvoiceCurrency)
      : DEFAULT_INVOICE_SETTINGS.defaultCurrency,
    defaultTaxRate: Number(process.env.INVOICE_DEFAULT_TAX_RATE) || 0,
    defaultPaymentTerms:
      process.env.INVOICE_DEFAULT_TERMS?.trim() ||
      DEFAULT_INVOICE_SETTINGS.defaultPaymentTerms,
    defaultNotes:
      process.env.INVOICE_DEFAULT_NOTES?.trim() ||
      DEFAULT_INVOICE_SETTINGS.defaultNotes,
  });
}

function resolveNotionWriteToken(): string {
  return (
    process.env.NOTION_INVOICES_TOKEN?.trim() ||
    process.env.NOTION_API_KEY?.trim() ||
    process.env.NOTION_AUTH_TOKEN?.trim() ||
    process.env.NOTION_API_TOKEN?.trim() ||
    process.env.NOTION_TOKEN?.trim() ||
    ""
  );
}

let cachedClient: Client | null = null;
let cachedClientToken = "";
function getRemoteClient(): Client | null {
  const token = resolveNotionWriteToken();
  if (!token) return null;
  if (!cachedClient || cachedClientToken !== token) {
    cachedClientToken = token;
    cachedClient = new Client({
      auth: token,
      notionVersion: process.env.NOTION_API_VERSION?.trim() || API_VERSION,
    });
  }
  return cachedClient;
}

export function getInvoiceStorageMode(): StorageMode {
  return Boolean(
    resolveNotionWriteToken() && process.env.NOTION_INVOICES_ID?.trim(),
  )
    ? "cloud"
    : "session";
}

async function resolveDataSource(
  client: Client,
  rawId: string,
): Promise<CachedDataSource> {
  const cleanId = rawId.trim();
  const hit = dsCache.get(cleanId);
  if (hit && hit.expiresAt > Date.now()) return hit;

  let dataSourceId = cleanId;
  try {
    const db = (await client.databases.retrieve({
      database_id: cleanId,
    })) as unknown as {
      data_sources?: Array<{ id: string }>;
    };
    if (db.data_sources?.[0]?.id) {
      dataSourceId = db.data_sources[0].id;
    }
  } catch {
    // ID may already be a direct data_source_id.
  }

  const ds = (await client.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as {
    properties?: Record<string, { id: string; type: string }>;
  };

  const properties: PropertyMap = ds.properties ?? {};
  const titleProp =
    Object.entries(properties).find(([, v]) => v.type === "title")?.[0] ??
    "Name";

  const entry: CachedDataSource = {
    dataSourceId,
    titleProp,
    properties,
    expiresAt: Date.now() + SCHEMA_TTL_MS,
  };
  dsCache.set(cleanId, entry);
  return entry;
}

function toRichTextChunks(value: string) {
  if (!value) return [];
  const chunks: Array<{ type: "text"; text: { content: string } }> = [];
  for (let i = 0; i < value.length; i += RICH_TEXT_CHUNK) {
    chunks.push({
      type: "text",
      text: { content: value.slice(i, i + RICH_TEXT_CHUNK) },
    });
  }
  return chunks;
}

function readPlainText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
    email?: string | null;
    phone_number?: string | null;
    url?: string | null;
    select?: { name?: string } | null;
    status?: { name?: string } | null;
  };
  if (p.type === "title" && Array.isArray(p.title)) {
    return p.title.map((t) => t.plain_text ?? "").join("");
  }
  if (p.type === "rich_text" && Array.isArray(p.rich_text)) {
    return p.rich_text.map((t) => t.plain_text ?? "").join("");
  }
  if (p.type === "email") return p.email ?? "";
  if (p.type === "phone_number") return p.phone_number ?? "";
  if (p.type === "url") return p.url ?? "";
  if (p.type === "select") return p.select?.name ?? "";
  if (p.type === "status") return p.status?.name ?? "";
  return "";
}

function readNumber(prop: unknown, fallback = 0): number {
  if (!prop || typeof prop !== "object") return fallback;
  const p = prop as { type?: string; number?: number | null };
  return p.type === "number" && typeof p.number === "number"
    ? p.number
    : fallback;
}

function readDate(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { type?: string; date?: { start?: string } | null };
  return p.type === "date" && p.date?.start ? p.date.start.slice(0, 10) : "";
}

function readCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== "object") return false;
  const p = prop as { type?: string; checkbox?: boolean };
  return p.type === "checkbox" ? Boolean(p.checkbox) : false;
}

function findPropName(
  schema: PropertyMap,
  candidates: string[],
): { name: string; type: string } | null {
  const lowerLookup = new Map<string, [string, { id: string; type: string }]>();
  for (const [k, v] of Object.entries(schema)) {
    lowerLookup.set(k.toLowerCase(), [k, v]);
  }
  for (const c of candidates) {
    const match = lowerLookup.get(c.toLowerCase());
    if (match) return { name: match[0], type: match[1].type };
  }
  return null;
}

function assignPropertyValue(
  out: Record<string, unknown>,
  schema: PropertyMap,
  candidates: string[],
  value: string | number | boolean | null,
) {
  const target = findPropName(schema, candidates);
  if (!target) return;
  const { name, type } = target;

  if (type === "rich_text") {
    out[name] = {
      rich_text: typeof value === "string" ? toRichTextChunks(value) : [],
    };
  } else if (type === "number") {
    out[name] = {
      number:
        typeof value === "number" && Number.isFinite(value) ? value : null,
    };
  } else if (type === "select") {
    out[name] = {
      select: typeof value === "string" && value ? { name: value } : null,
    };
  } else if (type === "status") {
    if (typeof value === "string" && value) {
      out[name] = { status: { name: value } };
    }
  } else if (type === "date") {
    out[name] = {
      date:
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
          ? { start: value.slice(0, 10) }
          : null,
    };
  } else if (type === "email") {
    out[name] = {
      email: typeof value === "string" && value ? value : null,
    };
  } else if (type === "phone_number") {
    out[name] = {
      phone_number: typeof value === "string" && value ? value : null,
    };
  } else if (type === "url") {
    out[name] = {
      url: typeof value === "string" && value ? value : null,
    };
  } else if (type === "checkbox") {
    out[name] = { checkbox: Boolean(value) };
  }
}

function buildInvoiceBodyBlocks(record: InvoiceRecord): BlockObjectRequest[] {
  const cell = (text: string) => [
    { type: "text" as const, text: { content: text.slice(0, 1800) } },
  ];

  const headerRow: BlockObjectRequest = {
    object: "block",
    type: "table_row",
    table_row: {
      cells: [
        cell("#"),
        cell("Description"),
        cell("Qty"),
        cell("Unit Price"),
        cell("Amount"),
      ],
    },
  };

  const itemRows: BlockObjectRequest[] = record.items
    .slice(0, 80)
    .map((item, idx) => ({
      object: "block",
      type: "table_row",
      table_row: {
        cells: [
          cell(String(idx + 1)),
          cell(item.description),
          cell(String(item.quantity)),
          cell(formatInvoiceMoney(item.unitPrice, record.currency)),
          cell(
            formatInvoiceMoney(
              roundMoney(item.quantity * item.unitPrice, record.currency),
              record.currency,
            ),
          ),
        ],
      },
    }));

  const blocks: BlockObjectRequest[] = [
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: cell(
          `Invoice ${record.invoiceNumber} · ${record.client.name}${
            record.client.company ? ` (${record.client.company})` : ""
          }`,
        ),
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: cell(
          `Status: ${record.status}  |  Issued: ${record.issueDate}${
            record.dueDate ? `  |  Due: ${record.dueDate}` : ""
          }  |  Total: ${formatInvoiceMoney(record.total, record.currency)}`,
        ),
      },
    },
    {
      object: "block",
      type: "table",
      table: {
        table_width: 5,
        has_column_header: true,
        has_row_header: false,
        children: [headerRow, ...itemRows] as never,
      },
    },
  ];

  if (record.notes || record.paymentTerms) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: cell(
          [
            record.notes ? `Notes: ${record.notes}` : "",
            record.paymentTerms ? `Terms: ${record.paymentTerms}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      },
    });
  }

  return blocks;
}

type SerializedInvoiceEnvelope = {
  __kind: "invoice";
  v: 1;
  data: Omit<
    InvoiceRecord,
    "id" | "subtotal" | "discountAmount" | "taxAmount" | "total"
  >;
};

type SerializedClientEnvelope = {
  __kind: "client";
  v: 1;
  data: Omit<ClientRecord, "id">;
};

function parseInvoiceFromPage(page: PageObjectResponse): InvoiceRecord | null {
  const props = page.properties ?? {};
  for (const k of ["Archived", "Deleted"]) {
    if (props[k] && readCheckbox(props[k])) return null;
  }
  const kindProp = props["Kind"] ?? props["Record Type"];
  if (kindProp) {
    const kindVal = readPlainText(kindProp).toLowerCase();
    if (kindVal === "client" || kindVal === "settings") return null;
  }

  // Prefer canonical JSON envelope stored in Items JSON / Payload JSON
  const jsonField =
    props["Items JSON"] ?? props["Payload JSON"] ?? props["Line Items JSON"];
  const rawJson = jsonField ? readPlainText(jsonField) : "";

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as
        SerializedInvoiceEnvelope | InvoiceLineItem[];
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        parsed.__kind === "invoice"
      ) {
        const d = parsed.data;
        const totals = computeInvoiceTotals(
          d.items,
          d.taxRate,
          d.discountType,
          d.discountValue,
          d.currency,
        );
        return {
          ...d,
          id: page.id,
          status: deriveEffectiveStatus(d.status, d.dueDate),
          ...totals,
          createdAt: d.createdAt || page.created_time,
          updatedAt: page.last_edited_time || d.updatedAt,
        };
      }
      if (Array.isArray(parsed)) {
        // Legacy items-only JSON array: hydrate remaining fields from columns.
        const titleEntry = Object.values(props).find(
          (p) => (p as { type?: string }).type === "title",
        );
        const invoiceNumber = readPlainText(titleEntry) || "INV-0001";
        const rawStatus = readPlainText(props["Status"]) as InvoiceStatus;
        const status: InvoiceStatus = INVOICE_STATUSES.includes(rawStatus)
          ? rawStatus
          : "Draft";
        const rawCurr = readPlainText(props["Currency"]) as InvoiceCurrency;
        const currency: InvoiceCurrency = INVOICE_CURRENCIES.includes(rawCurr)
          ? rawCurr
          : "LKR";
        const issueDate =
          readDate(props["Issue Date"]) || page.created_time.slice(0, 10);
        const dueDate = readDate(props["Due Date"]);
        const paidDate = readDate(props["Paid Date"]);
        const taxRate = readNumber(props["Tax Rate"], 0);
        const discountValue = readNumber(props["Discount"], 0);
        const rawSnap = readPlainText(props["Client Snapshot"]);
        let client = {
          name: readPlainText(props["Client Name"]) || "Client",
          company: readPlainText(props["Company"]),
          email: readPlainText(props["Client Email"]),
          phone: readPlainText(props["Client Phone"]),
          address: readPlainText(props["Client Address"]),
        };
        if (rawSnap) {
          try {
            client = { ...client, ...JSON.parse(rawSnap) };
          } catch {
            // keep column fallback
          }
        }
        const totals = computeInvoiceTotals(
          parsed,
          taxRate,
          "fixed",
          discountValue,
          currency,
        );
        return {
          id: page.id,
          invoiceNumber,
          status: deriveEffectiveStatus(status, dueDate),
          issueDate,
          dueDate,
          paidDate,
          currency,
          clientId: readPlainText(props["Client ID"]),
          client,
          items: parsed,
          taxRate,
          discountType: "fixed",
          discountValue,
          ...totals,
          notes: readPlainText(props["Notes"]),
          paymentTerms: readPlainText(props["Payment Terms"]),
          createdAt: page.created_time,
          updatedAt: page.last_edited_time,
        };
      }
    } catch {
      // Fall through to column-level hydration.
    }
  }

  const titleEntry = Object.values(props).find(
    (p) => (p as { type?: string }).type === "title",
  );
  const invoiceNumber = readPlainText(titleEntry);
  if (!invoiceNumber) return null;

  const rawStatus = readPlainText(props["Status"]) as InvoiceStatus;
  const status: InvoiceStatus = INVOICE_STATUSES.includes(rawStatus)
    ? rawStatus
    : "Draft";
  const rawCurr = readPlainText(props["Currency"]) as InvoiceCurrency;
  const currency: InvoiceCurrency = INVOICE_CURRENCIES.includes(rawCurr)
    ? rawCurr
    : "LKR";
  const issueDate =
    readDate(props["Issue Date"]) || page.created_time.slice(0, 10);
  const dueDate = readDate(props["Due Date"]);
  const totalFromCol = readNumber(props["Total"], 0);
  const items: InvoiceLineItem[] = [
    {
      id: "item-1",
      description: "Engineering services",
      quantity: 1,
      unitPrice: totalFromCol,
    },
  ];
  const totals = computeInvoiceTotals(items, 0, "fixed", 0, currency);

  return {
    id: page.id,
    invoiceNumber,
    status: deriveEffectiveStatus(status, dueDate),
    issueDate,
    dueDate,
    paidDate: readDate(props["Paid Date"]),
    currency,
    clientId: "",
    client: {
      name: readPlainText(props["Client Name"]) || "Client",
      company: readPlainText(props["Company"]),
      email: readPlainText(props["Client Email"]),
      phone: readPlainText(props["Client Phone"]),
      address: readPlainText(props["Client Address"]),
    },
    items,
    taxRate: 0,
    discountType: "fixed",
    discountValue: 0,
    ...totals,
    notes: readPlainText(props["Notes"]),
    paymentTerms: readPlainText(props["Payment Terms"]),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

function buildInvoiceProperties(
  ds: CachedDataSource,
  record: InvoiceRecord,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [ds.titleProp]: {
      title: [{ type: "text", text: { content: record.invoiceNumber } }],
    },
  };

  const envelope: SerializedInvoiceEnvelope = {
    __kind: "invoice",
    v: 1,
    data: {
      invoiceNumber: record.invoiceNumber,
      status: record.status,
      issueDate: record.issueDate,
      dueDate: record.dueDate,
      paidDate: record.paidDate,
      currency: record.currency,
      clientId: record.clientId,
      client: record.client,
      items: record.items,
      taxRate: record.taxRate,
      discountType: record.discountType,
      discountValue: record.discountValue,
      notes: record.notes,
      paymentTerms: record.paymentTerms,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  };

  assignPropertyValue(props, ds.properties, ["Kind", "Record Type"], "Invoice");
  assignPropertyValue(props, ds.properties, ["Status"], record.status);
  assignPropertyValue(props, ds.properties, ["Issue Date"], record.issueDate);
  assignPropertyValue(
    props,
    ds.properties,
    ["Due Date"],
    record.dueDate || null,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Paid Date"],
    record.paidDate || null,
  );
  assignPropertyValue(props, ds.properties, ["Currency"], record.currency);
  assignPropertyValue(props, ds.properties, ["Subtotal"], record.subtotal);
  assignPropertyValue(props, ds.properties, ["Tax Rate"], record.taxRate);
  assignPropertyValue(props, ds.properties, ["Tax Amount"], record.taxAmount);
  assignPropertyValue(
    props,
    ds.properties,
    ["Discount", "Discount Amount"],
    record.discountAmount,
  );
  assignPropertyValue(props, ds.properties, ["Total"], record.total);
  assignPropertyValue(
    props,
    ds.properties,
    ["Client Name", "Client"],
    record.client.name,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Client Email", "Email"],
    record.client.email,
  );
  assignPropertyValue(props, ds.properties, ["Company"], record.client.company);
  assignPropertyValue(
    props,
    ds.properties,
    ["Client Snapshot"],
    JSON.stringify(record.client),
  );
  assignPropertyValue(props, ds.properties, ["Notes"], record.notes);
  assignPropertyValue(
    props,
    ds.properties,
    ["Payment Terms", "Terms"],
    record.paymentTerms,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Items JSON", "Payload JSON", "Line Items JSON"],
    JSON.stringify(envelope),
  );

  return props;
}

async function queryAllPages(
  client: Client,
  dataSourceId: string,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 10; guard++) {
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const item of res.results) {
      if (item.object === "page" && "properties" in item) {
        const page = item as PageObjectResponse;
        if (!page.in_trash && !page.archived) {
          pages.push(page);
        }
      }
    }
    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return pages;
}

export async function listInvoices(): Promise<{
  invoices: InvoiceRecord[];
  storageMode: StorageMode;
}> {
  const client = getRemoteClient();
  const invoicesDbId = process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !invoicesDbId) {
    const list = memoryState.invoices
      .map((inv) => ({
        ...inv,
        status: deriveEffectiveStatus(inv.status, inv.dueDate),
      }))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return { invoices: list, storageMode: "session" };
  }

  const ds = await resolveDataSource(client, invoicesDbId);
  const pages = await queryAllPages(client, ds.dataSourceId);
  const invoices = pages
    .map(parseInvoiceFromPage)
    .filter((item): item is InvoiceRecord => item !== null)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  return { invoices, storageMode: "cloud" };
}

export async function getInvoiceById(
  id: string,
): Promise<InvoiceRecord | null> {
  const client = getRemoteClient();
  const invoicesDbId = process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !invoicesDbId) {
    return memoryState.invoices.find((i) => i.id === id) ?? null;
  }
  try {
    const page = await client.pages.retrieve({ page_id: id });
    if (!("properties" in page) || page.in_trash || page.archived) return null;
    return parseInvoiceFromPage(page as PageObjectResponse);
  } catch {
    return null;
  }
}

export async function createInvoice(
  input: InvoiceInput,
): Promise<InvoiceRecord> {
  const now = new Date().toISOString();
  const totals = computeInvoiceTotals(
    input.items,
    input.taxRate,
    input.discountType,
    input.discountValue,
    input.currency,
  );
  const paidDate =
    input.status === "Paid" && !input.paidDate
      ? now.slice(0, 10)
      : input.paidDate;

  const draftRecord: InvoiceRecord = {
    ...input,
    id: randomUUID(),
    paidDate,
    status: deriveEffectiveStatus(input.status, input.dueDate),
    ...totals,
    createdAt: now,
    updatedAt: now,
  };

  const client = getRemoteClient();
  const invoicesDbId = process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !invoicesDbId) {
    memoryState.invoices.unshift(draftRecord);
    return draftRecord;
  }

  const ds = await resolveDataSource(client, invoicesDbId);
  const properties = buildInvoiceProperties(ds, draftRecord);
  const children = buildInvoiceBodyBlocks(draftRecord);

  const created = await client.pages.create({
    parent: { data_source_id: ds.dataSourceId },
    properties: properties as never,
    children,
  });

  return {
    ...draftRecord,
    id: created.id,
  };
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput,
): Promise<InvoiceRecord | null> {
  const now = new Date().toISOString();
  const totals = computeInvoiceTotals(
    input.items,
    input.taxRate,
    input.discountType,
    input.discountValue,
    input.currency,
  );
  const paidDate =
    input.status === "Paid" && !input.paidDate
      ? now.slice(0, 10)
      : input.paidDate;

  const client = getRemoteClient();
  const invoicesDbId = process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !invoicesDbId) {
    const idx = memoryState.invoices.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    const updated: InvoiceRecord = {
      ...input,
      id,
      paidDate,
      status: deriveEffectiveStatus(input.status, input.dueDate),
      ...totals,
      createdAt: memoryState.invoices[idx].createdAt,
      updatedAt: now,
    };
    memoryState.invoices[idx] = updated;
    return updated;
  }

  const existing = await getInvoiceById(id);
  if (!existing) return null;

  const updated: InvoiceRecord = {
    ...input,
    id,
    paidDate,
    status: deriveEffectiveStatus(input.status, input.dueDate),
    ...totals,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const ds = await resolveDataSource(client, invoicesDbId);
  const properties = buildInvoiceProperties(ds, updated);

  await client.pages.update({
    page_id: id,
    properties: properties as never,
    erase_content: true,
  });

  try {
    await client.blocks.children.append({
      block_id: id,
      children: buildInvoiceBodyBlocks(updated),
    });
  } catch {
    // Non-fatal if block body append is throttled; properties hold full truth.
  }

  return updated;
}

export async function archiveInvoice(id: string): Promise<boolean> {
  const client = getRemoteClient();
  const invoicesDbId = process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !invoicesDbId) {
    const before = memoryState.invoices.length;
    memoryState.invoices = memoryState.invoices.filter((i) => i.id !== id);
    return memoryState.invoices.length < before;
  }
  try {
    await client.pages.update({
      page_id: id,
      in_trash: true,
    });
    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   Client Directory CRUD (Dedicated DB or 1-DB Fallback)
   ========================================================= */

function parseClientFromPage(page: PageObjectResponse): ClientRecord | null {
  const props = page.properties ?? {};
  for (const k of ["Archived", "Deleted"]) {
    if (props[k] && readCheckbox(props[k])) return null;
  }

  const jsonField =
    props["Payload JSON"] ?? props["Items JSON"] ?? props["Client Snapshot"];
  const rawJson = jsonField ? readPlainText(jsonField) : "";
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as SerializedClientEnvelope;
      if (parsed && parsed.__kind === "client") {
        return {
          ...parsed.data,
          id: page.id,
          createdAt: parsed.data.createdAt || page.created_time,
          updatedAt: page.last_edited_time || parsed.data.updatedAt,
        };
      }
      if ((parsed as { __kind?: string }).__kind === "invoice") {
        return null;
      }
    } catch {
      // fall through
    }
  }

  const hasDedicatedClientsDb = Boolean(process.env.NOTION_CLIENTS_ID?.trim());
  if (!hasDedicatedClientsDb) {
    const kind = readPlainText(props["Kind"] ?? props["Record Type"]);
    if (kind.toLowerCase() !== "client") return null;
  }

  const titleEntry = Object.values(props).find(
    (p) => (p as { type?: string }).type === "title",
  );
  const name = readPlainText(titleEntry);
  if (!name) return null;

  const rawCurr = readPlainText(
    props["Default Currency"] ?? props["Currency"],
  ) as InvoiceCurrency;

  return {
    id: page.id,
    name,
    company: readPlainText(props["Company"]),
    email: readPlainText(props["Email"] ?? props["Client Email"]),
    phone: readPlainText(props["Phone"] ?? props["Client Phone"]),
    address: readPlainText(props["Billing Address"] ?? props["Address"]),
    defaultCurrency: INVOICE_CURRENCIES.includes(rawCurr) ? rawCurr : "LKR",
    notes: readPlainText(props["Notes"]),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

function buildClientProperties(
  ds: CachedDataSource,
  record: ClientRecord,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [ds.titleProp]: {
      title: [{ type: "text", text: { content: record.name } }],
    },
  };

  const envelope: SerializedClientEnvelope = {
    __kind: "client",
    v: 1,
    data: {
      name: record.name,
      company: record.company,
      email: record.email,
      phone: record.phone,
      address: record.address,
      defaultCurrency: record.defaultCurrency,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  };

  assignPropertyValue(props, ds.properties, ["Kind", "Record Type"], "Client");
  assignPropertyValue(props, ds.properties, ["Company"], record.company);
  assignPropertyValue(
    props,
    ds.properties,
    ["Email", "Client Email"],
    record.email,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Phone", "Client Phone"],
    record.phone,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Billing Address", "Address"],
    record.address,
  );
  assignPropertyValue(
    props,
    ds.properties,
    ["Default Currency", "Currency"],
    record.defaultCurrency,
  );
  assignPropertyValue(props, ds.properties, ["Notes"], record.notes);
  assignPropertyValue(
    props,
    ds.properties,
    ["Payload JSON", "Items JSON", "Client Snapshot"],
    JSON.stringify(envelope),
  );

  return props;
}

export async function listClients(): Promise<ClientRecord[]> {
  const client = getRemoteClient();
  const targetDb =
    process.env.NOTION_CLIENTS_ID?.trim() ||
    process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !targetDb) {
    return [...memoryState.clients].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  const ds = await resolveDataSource(client, targetDb);
  const pages = await queryAllPages(client, ds.dataSourceId);
  return pages
    .map(parseClientFromPage)
    .filter((c): c is ClientRecord => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createClientRecord(
  input: ClientInput,
): Promise<ClientRecord> {
  const now = new Date().toISOString();
  const draft: ClientRecord = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const client = getRemoteClient();
  const targetDb =
    process.env.NOTION_CLIENTS_ID?.trim() ||
    process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !targetDb) {
    memoryState.clients.push(draft);
    return draft;
  }
  const ds = await resolveDataSource(client, targetDb);
  const created = await client.pages.create({
    parent: { data_source_id: ds.dataSourceId },
    properties: buildClientProperties(ds, draft) as never,
  });
  return { ...draft, id: created.id };
}

export async function updateClientRecord(
  id: string,
  input: ClientInput,
): Promise<ClientRecord | null> {
  const now = new Date().toISOString();
  const client = getRemoteClient();
  const targetDb =
    process.env.NOTION_CLIENTS_ID?.trim() ||
    process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !targetDb) {
    const idx = memoryState.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated: ClientRecord = {
      ...input,
      id,
      createdAt: memoryState.clients[idx].createdAt,
      updatedAt: now,
    };
    memoryState.clients[idx] = updated;
    return updated;
  }

  const ds = await resolveDataSource(client, targetDb);
  const updated: ClientRecord = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await client.pages.update({
    page_id: id,
    properties: buildClientProperties(ds, updated) as never,
  });
  return updated;
}

export async function archiveClientRecord(id: string): Promise<boolean> {
  const client = getRemoteClient();
  const targetDb =
    process.env.NOTION_CLIENTS_ID?.trim() ||
    process.env.NOTION_INVOICES_ID?.trim();
  if (!client || !targetDb) {
    const before = memoryState.clients.length;
    memoryState.clients = memoryState.clients.filter((c) => c.id !== id);
    return memoryState.clients.length < before;
  }
  try {
    await client.pages.update({ page_id: id, in_trash: true });
    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   Business Settings Persistence
   ========================================================= */

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const envDefaults = getEnvDefaultsForSettings();
  const client = getRemoteClient();
  const settingsPageId = process.env.NOTION_INVOICE_SETTINGS_PAGE_ID?.trim();

  if (!client || !settingsPageId) {
    return memoryState.settings ?? envDefaults;
  }

  try {
    const blocks = await client.blocks.children.list({
      block_id: settingsPageId,
      page_size: 20,
    });
    for (const block of blocks.results) {
      if ("type" in block && block.type === "code" && "code" in block) {
        const text = block.code.rich_text
          .map((t) => t.plain_text ?? "")
          .join("");
        const parsed = InvoiceSettingsSchema.safeParse(JSON.parse(text));
        if (parsed.success) {
          memoryState.settings = parsed.data;
          return parsed.data;
        }
      }
    }
  } catch {
    // Fall back gracefully to env/session settings.
  }

  return memoryState.settings ?? envDefaults;
}

export async function saveInvoiceSettings(
  next: InvoiceSettings,
): Promise<InvoiceSettings> {
  const validated = InvoiceSettingsSchema.parse(next);
  memoryState.settings = validated;

  const client = getRemoteClient();
  const settingsPageId = process.env.NOTION_INVOICE_SETTINGS_PAGE_ID?.trim();
  if (!client || !settingsPageId) {
    return validated;
  }

  try {
    await client.pages.update({
      page_id: settingsPageId,
      erase_content: true,
    });
    await client.blocks.children.append({
      block_id: settingsPageId,
      children: [
        {
          object: "block",
          type: "code",
          code: {
            language: "json",
            rich_text: toRichTextChunks(JSON.stringify(validated, null, 2)),
          },
        },
      ],
    });
  } catch {
    // Keep memoryState.settings updated even if remote page write fails.
  }

  return validated;
}
