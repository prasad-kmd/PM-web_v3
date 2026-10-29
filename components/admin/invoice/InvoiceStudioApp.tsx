"use client";

import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Building03Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  Download04Icon,
  File02Icon,
  Invoice02Icon,
  PencilEdit01Icon,
  RefreshIcon,
  Search01Icon,
  Settings02Icon,
  Upload04Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { InvoicePaperPreview } from "@/components/admin/invoice/InvoicePaperPreview";
import {
  downloadClientInvoicePdf,
  previewClientInvoicePdfInTab,
} from "@/components/admin/invoice/pdf/export-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  computeInvoiceTotals,
  CURRENCY_META,
  DEFAULT_INVOICE_SETTINGS,
  formatInvoiceMoney,
  formatNextInvoiceNumber,
  INVOICE_CURRENCIES,
  INVOICE_STATUSES,
  roundMoney,
  type ClientInput,
  type ClientRecord,
  type DiscountType,
  type InvoiceCurrency,
  type InvoiceInput,
  type InvoiceLineItem,
  type InvoiceRecord,
  type InvoiceSettings,
  type InvoiceStatus,
} from "@/lib/invoices/types";

type LedgerTab = "overview" | "invoices" | "composer" | "clients" | "settings";
type ComposerMobileView = "editor" | "preview";

const STATUS_SELECT_ITEMS = INVOICE_STATUSES.map((st) => ({
  value: st,
  label: st,
}));

const CURRENCY_SELECT_ITEMS = INVOICE_CURRENCIES.map((curr) => ({
  value: curr,
  label: CURRENCY_META[curr].label,
}));

const CURRENCY_SHORT_SELECT_ITEMS = INVOICE_CURRENCIES.map((curr) => ({
  value: curr,
  label: curr,
}));

const CURRENCY_FILTER_SELECT_ITEMS = [
  { value: "All", label: "All currencies" },
  ...CURRENCY_SHORT_SELECT_ITEMS,
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso: string, days: number): string {
  const base = baseIso ? new Date(`${baseIso}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return todayIso();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function newLineItemId(): string {
  return `li-${Math.random().toString(36).slice(2, 9)}`;
}

function createFreshDraft(
  settings: InvoiceSettings,
  existingInvoices: InvoiceRecord[],
  presetClient?: ClientRecord,
): InvoiceInput {
  const issue = todayIso();
  return {
    invoiceNumber: formatNextInvoiceNumber(
      existingInvoices.map((i) => i.invoiceNumber),
      settings.invoicePrefix,
      settings.invoicePadding,
    ),
    status: "Draft",
    issueDate: issue,
    dueDate: addDaysIso(issue, 14),
    paidDate: "",
    currency: presetClient?.defaultCurrency ?? settings.defaultCurrency,
    clientId: presetClient?.id ?? "",
    client: presetClient
      ? {
          name: presetClient.name,
          company: presetClient.company,
          email: presetClient.email,
          phone: presetClient.phone,
          address: presetClient.address,
        }
      : {
          name: "",
          company: "",
          email: "",
          phone: "",
          address: "",
        },
    items: [
      {
        id: newLineItemId(),
        description: "Engineering consultation & system architecture",
        quantity: 1,
        unitPrice: 25000,
      },
    ],
    taxRate: settings.defaultTaxRate,
    discountType: "fixed",
    discountValue: 0,
    notes: settings.defaultNotes,
    paymentTerms: settings.defaultPaymentTerms,
  };
}

const EMPTY_CLIENT_FORM: ClientInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  defaultCurrency: "LKR",
  notes: "",
};

export function InvoiceStudioApp() {
  const [tab, setTab] = useState<LedgerTab>("overview");
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<"cloud" | "session">("cloud");

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings>(
    DEFAULT_INVOICE_SETTINGS,
  );

  // Ledger filters
  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>(
    "All",
  );
  const [currencyFilter, setCurrencyFilter] = useState<"All" | InvoiceCurrency>(
    "All",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Composer state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerMobileView, setComposerMobileView] =
    useState<ComposerMobileView>("editor");
  const [draft, setDraft] = useState<InvoiceInput>(() =>
    createFreshDraft(DEFAULT_INVOICE_SETTINGS, []),
  );
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  // Client Directory editor state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientInput>(EMPTY_CLIENT_FORM);
  const [savingClient, setSavingClient] = useState(false);

  // Settings save state
  const [savingSettings, setSavingSettings] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadWorkspaceLedger = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        invoices: InvoiceRecord[];
        clients: ClientRecord[];
        settings: InvoiceSettings;
        storageMode: "cloud" | "session";
      };
      setInvoices(data.invoices ?? []);
      setClients(data.clients ?? []);
      if (data.settings) setSettings(data.settings);
      if (data.storageMode) setStorageMode(data.storageMode);
      setEditingId((currentId) => {
        if (!currentId && (data.invoices?.length ?? 0) === 0 && data.settings) {
          setDraft(createFreshDraft(data.settings, []));
        }
        return currentId;
      });
    } catch {
      toast.error("Could not load ledger data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceLedger();
  }, [loadWorkspaceLedger]);

  function startNewInvoice(presetClient?: ClientRecord) {
    setEditingId(null);
    setComposerMobileView("editor");
    setDraft(createFreshDraft(settings, invoices, presetClient));
    setTab("composer");
  }

  function openInvoiceInComposer(record: InvoiceRecord) {
    setEditingId(record.id);
    setComposerMobileView("editor");
    setDraft({
      invoiceNumber: record.invoiceNumber,
      status: record.status,
      issueDate: record.issueDate,
      dueDate: record.dueDate,
      paidDate: record.paidDate,
      currency: record.currency,
      clientId: record.clientId,
      client: { ...record.client },
      items: record.items.map((item) => ({ ...item })),
      taxRate: record.taxRate,
      discountType: record.discountType,
      discountValue: record.discountValue,
      notes: record.notes,
      paymentTerms: record.paymentTerms,
    });
    setTab("composer");
  }

  function duplicateInvoice(record: InvoiceRecord) {
    const issue = todayIso();
    setEditingId(null);
    setDraft({
      invoiceNumber: formatNextInvoiceNumber(
        invoices.map((i) => i.invoiceNumber),
        settings.invoicePrefix,
        settings.invoicePadding,
      ),
      status: "Draft",
      issueDate: issue,
      dueDate: addDaysIso(issue, 14),
      paidDate: "",
      currency: record.currency,
      clientId: record.clientId,
      client: { ...record.client },
      items: record.items.map((item) => ({ ...item, id: newLineItemId() })),
      taxRate: record.taxRate,
      discountType: record.discountType,
      discountValue: record.discountValue,
      notes: record.notes,
      paymentTerms: record.paymentTerms,
    });
    setTab("composer");
    toast.success("Cloned into a fresh draft.");
  }

  async function handleSaveInvoice() {
    if (!draft.client.name.trim()) {
      toast.error("Enter a client name before saving.");
      return;
    }
    if (draft.items.some((item) => !item.description.trim())) {
      toast.error("Every line item requires a description.");
      return;
    }

    setSavingInvoice(true);
    try {
      const endpoint = editingId
        ? `/api/admin/invoices/${editingId}`
        : "/api/admin/invoices";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => ({}))) as {
        invoice?: InvoiceRecord;
        error?: string;
      };
      if (!res.ok || !data.invoice) {
        toast.error(data.error || "Could not save invoice.");
        return;
      }

      const saved = data.invoice;
      setInvoices((prev) =>
        editingId
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev],
      );
      setEditingId(saved.id);
      toast.success(
        editingId ? "Invoice updated." : "Invoice saved to ledger.",
      );
    } catch {
      toast.error("Could not save invoice.");
    } finally {
      setSavingInvoice(false);
    }
  }

  async function handleQuickStatusChange(
    record: InvoiceRecord,
    nextStatus: InvoiceStatus,
  ) {
    try {
      const payload: InvoiceInput = {
        invoiceNumber: record.invoiceNumber,
        status: nextStatus,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        paidDate:
          nextStatus === "Paid"
            ? record.paidDate || todayIso()
            : record.paidDate,
        currency: record.currency,
        clientId: record.clientId,
        client: record.client,
        items: record.items,
        taxRate: record.taxRate,
        discountType: record.discountType,
        discountValue: record.discountValue,
        notes: record.notes,
        paymentTerms: record.paymentTerms,
      };
      const res = await fetch(`/api/admin/invoices/${record.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { invoice?: InvoiceRecord };
      if (!res.ok || !data.invoice) throw new Error("Failed");
      setInvoices((prev) =>
        prev.map((item) => (item.id === record.id ? data.invoice! : item)),
      );
      if (editingId === record.id) {
        setDraft((prev) => ({ ...prev, status: nextStatus }));
      }
      toast.success(`Marked ${record.invoiceNumber} as ${nextStatus}.`);
    } catch {
      toast.error("Could not update invoice status.");
    }
  }

  async function handleDeleteInvoice(record: InvoiceRecord) {
    try {
      const res = await fetch(`/api/admin/invoices/${record.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed");
      setInvoices((prev) => prev.filter((item) => item.id !== record.id));
      if (editingId === record.id) {
        setEditingId(null);
        setDraft(
          createFreshDraft(
            settings,
            invoices.filter((i) => i.id !== record.id),
          ),
        );
      }
      toast.success(`Removed ${record.invoiceNumber}.`);
    } catch {
      toast.error("Could not remove invoice.");
    }
  }

  async function handleExportPdf(target: InvoiceInput, busyKey: string) {
    if (!target.client.name.trim()) {
      toast.error("Add a client name before exporting PDF.");
      return;
    }
    setPdfBusyId(busyKey);
    try {
      await downloadClientInvoicePdf(target, settings);
      toast.success("PDF generated and downloaded.");
    } catch {
      toast.error("Could not generate PDF.");
    } finally {
      setPdfBusyId(null);
    }
  }

  async function handlePreviewPdf(target: InvoiceInput, busyKey: string) {
    if (!target.client.name.trim()) {
      toast.error("Add a client name before previewing PDF.");
      return;
    }
    setPdfBusyId(busyKey);
    try {
      await previewClientInvoicePdfInTab(target, settings);
    } catch {
      toast.error("Could not open PDF preview.");
    } finally {
      setPdfBusyId(null);
    }
  }

  async function handleSaveCurrentBuyerToDirectory() {
    if (!draft.client.name.trim()) {
      toast.error("Enter a client name first.");
      return;
    }
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft.client,
          defaultCurrency: draft.currency,
          notes: "",
        }),
      });
      const data = (await res.json()) as {
        client?: ClientRecord;
        error?: string;
      };
      if (!res.ok || !data.client) {
        toast.error(data.error || "Could not save client.");
        return;
      }
      setClients((prev) =>
        [...prev, data.client!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDraft((prev) => ({ ...prev, clientId: data.client!.id }));
      toast.success("Saved client to directory.");
    } catch {
      toast.error("Could not save client.");
    }
  }

  async function handleSubmitClientForm(event: React.FormEvent) {
    event.preventDefault();
    if (!clientForm.name.trim()) {
      toast.error("Client name is required.");
      return;
    }
    setSavingClient(true);
    try {
      const endpoint = editingClientId
        ? `/api/admin/clients/${editingClientId}`
        : "/api/admin/clients";
      const method = editingClientId ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = (await res.json()) as {
        client?: ClientRecord;
        error?: string;
      };
      if (!res.ok || !data.client) {
        toast.error(data.error || "Could not save client.");
        return;
      }
      const saved = data.client;
      setClients((prev) =>
        (editingClientId
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved]
        ).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingClientId(null);
      setClientForm({
        ...EMPTY_CLIENT_FORM,
        defaultCurrency: settings.defaultCurrency,
      });
      toast.success(editingClientId ? "Client updated." : "Client added.");
    } catch {
      toast.error("Could not save client.");
    } finally {
      setSavingClient(false);
    }
  }

  async function handleDeleteClient(client: ClientRecord) {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed");
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      if (editingClientId === client.id) {
        setEditingClientId(null);
        setClientForm(EMPTY_CLIENT_FORM);
      }
      toast.success(`Removed ${client.name}.`);
    } catch {
      toast.error("Could not remove client.");
    }
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/invoice-settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as {
        settings?: InvoiceSettings;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        toast.error(data.error || "Could not save settings.");
        return;
      }
      setSettings(data.settings);
      toast.success("Business profile & defaults saved.");
    } catch {
      toast.error("Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setSettings((prev) => ({
          ...prev,
          logoUrl: canvas.toDataURL("image/png"),
        }));
        toast.success("Logo updated.");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Filtered ledger list
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (currencyFilter !== "All" && inv.currency !== currencyFilter)
        return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q) ||
        inv.client.company.toLowerCase().includes(q) ||
        inv.client.email.toLowerCase().includes(q)
      );
    });
  }, [currencyFilter, invoices, searchQuery, statusFilter]);

  // KPI metrics grouped in primary currency (settings.defaultCurrency) + counts
  const kpi = useMemo(() => {
    const primary = settings.defaultCurrency;
    let paidSum = 0;
    let outstandingSum = 0;
    let overdueSum = 0;
    let overdueCount = 0;
    let draftCount = 0;

    for (const inv of invoices) {
      if (inv.status === "Draft") draftCount++;
      if (inv.status === "Overdue") overdueCount++;
      if (inv.currency !== primary) continue;
      if (inv.status === "Paid") paidSum += inv.total;
      if (inv.status === "Sent" || inv.status === "Overdue") {
        outstandingSum += inv.total;
      }
      if (inv.status === "Overdue") overdueSum += inv.total;
    }

    return {
      primary,
      paidSum: roundMoney(paidSum, primary),
      outstandingSum: roundMoney(outstandingSum, primary),
      overdueSum: roundMoney(overdueSum, primary),
      overdueCount,
      draftCount,
      totalCount: invoices.length,
    };
  }, [invoices, settings.defaultCurrency]);

  const draftTotals = useMemo(
    () =>
      computeInvoiceTotals(
        draft.items,
        draft.taxRate,
        draft.discountType,
        draft.discountValue,
        draft.currency,
      ),
    [
      draft.currency,
      draft.discountType,
      draft.discountValue,
      draft.items,
      draft.taxRate,
    ],
  );

  const clientSelectItems = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: "__custom__", label: "Custom recipient" },
      ...clients.map((c) => ({
        value: c.id,
        label: c.company ? `${c.name} · ${c.company}` : c.name,
      })),
    ];
    if (draft.clientId && !clients.some((c) => c.id === draft.clientId)) {
      list.push({
        value: draft.clientId,
        label: draft.client.name
          ? draft.client.company
            ? `${draft.client.name} · ${draft.client.company}`
            : draft.client.name
          : "Saved recipient",
      });
    }
    return list;
  }, [clients, draft.client.company, draft.client.name, draft.clientId]);

  const discountModeSelectItems = useMemo(
    () => [
      { value: "fixed", label: `Fixed (${draft.currency})` },
      { value: "percent", label: "Percentage (%)" },
    ],
    [draft.currency],
  );

  function updateItem(index: number, patch: Partial<InvoiceLineItem>) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) =>
        idx === index ? { ...it, ...patch } : it,
      ),
    }));
  }

  function moveItem(index: number, delta: -1 | 1) {
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.items.length) return prev;
      const next = [...prev.items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, items: next };
    });
  }

  function removeItem(index: number) {
    setDraft((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index),
      };
    });
  }

  return (
    <div className="admin-studio-shell invoice-studio-shell">
      {/* 42px Split Ledger Sub-Toolbar */}
      <header className="admin-studio-toolbar">
        <div className="admin-studio-toolbar-left">
          <nav
            className="admin-segmented-tabs"
            aria-label="Invoice studio sections"
          >
            {(
              [
                { id: "overview", label: "Overview", icon: File02Icon },
                {
                  id: "invoices",
                  label: `Invoices (${invoices.length})`,
                  icon: Invoice02Icon,
                },
                {
                  id: "composer",
                  label: editingId ? `Edit ${draft.invoiceNumber}` : "Composer",
                  icon: PencilEdit01Icon,
                },
                {
                  id: "clients",
                  label: `Clients (${clients.length})`,
                  icon: UserCircleIcon,
                },
                { id: "settings", label: "Settings", icon: Settings02Icon },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`admin-segmented-tab${tab === item.id ? " is-active" : ""}`}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} size={13} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-studio-toolbar-right">
          <span
            className={`invoice-sync-pill${storageMode === "cloud" ? " is-cloud" : ""}`}
          >
            <span className="invoice-sync-dot" aria-hidden />
            <span>
              {storageMode === "cloud" ? "Ledger synced" : "Session draft mode"}
            </span>
          </span>

          <Button
            size="xs"
            variant="ghost"
            onClick={() => void loadWorkspaceLedger(false)}
            aria-label="Refresh ledger"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} size={13} />
          </Button>

          <Button size="xs" onClick={() => startNewInvoice()}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} size={13} />
            <span>New Invoice</span>
          </Button>
        </div>
      </header>

      {/* Tab 1: Overview */}
      {tab === "overview" && (
        <div className="invoice-pane-scroll">
          <div className="invoice-kpi-grid tabular-nums">
            <div className="invoice-kpi-card">
              <span className="invoice-kpi-label">
                Collected ({kpi.primary})
              </span>
              <strong className="invoice-kpi-value is-emerald">
                {formatInvoiceMoney(kpi.paidSum, kpi.primary)}
              </strong>
              <small className="invoice-kpi-sub">Settled invoices</small>
            </div>

            <div className="invoice-kpi-card">
              <span className="invoice-kpi-label">
                Outstanding ({kpi.primary})
              </span>
              <strong className="invoice-kpi-value">
                {formatInvoiceMoney(kpi.outstandingSum, kpi.primary)}
              </strong>
              <small className="invoice-kpi-sub">Awaiting settlement</small>
            </div>

            <div className="invoice-kpi-card">
              <span className="invoice-kpi-label">Overdue</span>
              <strong
                className={`invoice-kpi-value${kpi.overdueCount > 0 ? " is-danger" : ""}`}
              >
                {formatInvoiceMoney(kpi.overdueSum, kpi.primary)}
              </strong>
              <small className="invoice-kpi-sub">
                {kpi.overdueCount}{" "}
                {kpi.overdueCount === 1 ? "invoice" : "invoices"} past due
              </small>
            </div>

            <div className="invoice-kpi-card">
              <span className="invoice-kpi-label">Ledger Volume</span>
              <strong className="invoice-kpi-value">{kpi.totalCount}</strong>
              <small className="invoice-kpi-sub">
                {kpi.draftCount} active{" "}
                {kpi.draftCount === 1 ? "draft" : "drafts"} · {clients.length}{" "}
                {clients.length === 1 ? "client" : "clients"}
              </small>
            </div>
          </div>

          <section className="invoice-section-card">
            <div className="invoice-section-head">
              <div>
                <h3>Recent Ledger Activity</h3>
                <p>Latest invoices with one-click client-side PDF export</p>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setTab("invoices")}
              >
                View full ledger
              </Button>
            </div>

            {loading ? (
              <p className="invoice-empty-state">Loading workspace ledger…</p>
            ) : invoices.length === 0 ? (
              <div className="invoice-empty-state">
                <p>No invoices recorded yet.</p>
                <Button size="sm" onClick={() => startNewInvoice()}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} size={14} />
                  <span>Compose your first invoice</span>
                </Button>
              </div>
            ) : (
              <div className="invoice-table-wrap">
                <table className="invoice-ledger-table tabular-nums">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Client</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 6).map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-semibold">#{inv.invoiceNumber}</td>
                        <td>
                          <span className="block font-medium">
                            {inv.client.name}
                          </span>
                          {inv.client.company && (
                            <span className="block text-[11px] text-[var(--muted-ink)]">
                              {inv.client.company}
                            </span>
                          )}
                        </td>
                        <td>{inv.issueDate}</td>
                        <td>{inv.dueDate || "—"}</td>
                        <td>
                          <span
                            className={`invoice-status-pill is-${inv.status.toLowerCase()}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="text-right font-semibold">
                          {formatInvoiceMoney(inv.total, inv.currency)}
                        </td>
                        <td className="text-right">
                          <div className="invoice-row-actions">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openInvoiceInComposer(inv)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              loading={pdfBusyId === inv.id}
                              onClick={() => void handleExportPdf(inv, inv.id)}
                            >
                              <HugeiconsIcon
                                icon={Download04Icon}
                                strokeWidth={2}
                                size={12}
                              />
                              <span>PDF</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 2: Full Filterable Invoices Ledger */}
      {tab === "invoices" && (
        <div className="invoice-pane-scroll">
          <div className="invoice-filter-bar">
            <div className="admin-chip-wrap">
              {(["All", ...INVOICE_STATUSES] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`admin-chip-btn${statusFilter === st ? " is-active" : ""}`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="invoice-filter-controls">
              <Select
                items={CURRENCY_FILTER_SELECT_ITEMS}
                value={currencyFilter}
                onValueChange={(v) => {
                  if (v) setCurrencyFilter(v as "All" | InvoiceCurrency);
                }}
              >
                <SelectTrigger className="min-w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {CURRENCY_FILTER_SELECT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <div className="invoice-search-box">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} size={14} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search #, client, email…"
                />
              </div>
            </div>
          </div>

          <section className="invoice-section-card">
            {filteredInvoices.length === 0 ? (
              <div className="invoice-empty-state">
                <p>No invoices match the current filter.</p>
              </div>
            ) : (
              <div className="invoice-table-wrap">
                <table className="invoice-ledger-table tabular-nums">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Client</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-semibold">#{inv.invoiceNumber}</td>
                        <td>
                          <span className="block font-medium">
                            {inv.client.name}
                          </span>
                          {inv.client.email && (
                            <span className="block text-[11px] text-[var(--muted-ink)]">
                              {inv.client.email}
                            </span>
                          )}
                        </td>
                        <td>{inv.issueDate}</td>
                        <td>{inv.dueDate || "—"}</td>
                        <td>
                          <span
                            className={`invoice-status-pill is-${inv.status.toLowerCase()}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="text-right font-semibold">
                          {formatInvoiceMoney(inv.total, inv.currency)}
                        </td>
                        <td className="text-right">
                          <div className="invoice-row-actions">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openInvoiceInComposer(inv)}
                            >
                              Edit
                            </Button>
                            {inv.status !== "Paid" && (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() =>
                                  void handleQuickStatusChange(inv, "Paid")
                                }
                                title="Mark as Paid"
                              >
                                <HugeiconsIcon
                                  icon={CheckmarkCircle02Icon}
                                  strokeWidth={2}
                                  size={13}
                                />
                                <span>Mark Paid</span>
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => duplicateInvoice(inv)}
                              title="Duplicate invoice"
                            >
                              <HugeiconsIcon
                                icon={Copy01Icon}
                                strokeWidth={2}
                                size={13}
                              />
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              loading={pdfBusyId === inv.id}
                              onClick={() => void handleExportPdf(inv, inv.id)}
                            >
                              <HugeiconsIcon
                                icon={Download04Icon}
                                strokeWidth={2}
                                size={12}
                              />
                              <span>PDF</span>
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Remove ${inv.invoiceNumber}`}
                              onClick={() => void handleDeleteInvoice(inv)}
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                strokeWidth={2}
                                size={13}
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 3: 01 · Split Ledger Studio (50/50 Live Composer + A4 Preview) */}
      {tab === "composer" && (
        <div className={`invoice-split-studio is-mobile-${composerMobileView}`}>
          {/* Mobile / Narrow-Window Pane Switcher & Quick Actions */}
          <div className="invoice-mobile-composer-bar">
            <div
              className="admin-segmented-tabs"
              role="tablist"
              aria-label="Composer mobile view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={composerMobileView === "editor"}
                onClick={() => setComposerMobileView("editor")}
                className={`admin-segmented-tab${composerMobileView === "editor" ? " is-active" : ""}`}
              >
                <HugeiconsIcon
                  icon={PencilEdit01Icon}
                  strokeWidth={2}
                  size={13}
                />
                <span>Editor</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={composerMobileView === "preview"}
                onClick={() => setComposerMobileView("preview")}
                className={`admin-segmented-tab tabular-nums${composerMobileView === "preview" ? " is-active" : ""}`}
              >
                <HugeiconsIcon icon={File02Icon} strokeWidth={2} size={13} />
                <span>
                  Preview ·{" "}
                  {formatInvoiceMoney(draftTotals.total, draft.currency)}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="outline"
                loading={pdfBusyId === "composer-dl"}
                onClick={() => void handleExportPdf(draft, "composer-dl")}
              >
                <HugeiconsIcon
                  icon={Download04Icon}
                  strokeWidth={2}
                  size={13}
                />
                <span>PDF</span>
              </Button>
              <Button
                size="xs"
                loading={savingInvoice}
                onClick={() => void handleSaveInvoice()}
              >
                <span>{editingId ? "Update" : "Save"}</span>
              </Button>
            </div>
          </div>

          {/* Left Editor Pane */}
          <div className="invoice-composer-pane">
            <div className="admin-form-stack">
              {/* Document Header Metadata */}
              <section className="invoice-form-card">
                <div className="invoice-form-card-head">
                  <h4>
                    {editingId
                      ? `Editing #${draft.invoiceNumber}`
                      : "New Invoice"}
                  </h4>
                  {editingId && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => startNewInvoice()}
                    >
                      Start blank draft
                    </Button>
                  )}
                </div>

                <div className="admin-field-grid-3">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-num">
                      Invoice #
                    </label>
                    <Input
                      id="inv-num"
                      size="sm"
                      className="tabular-nums"
                      value={draft.invoiceNumber}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          invoiceNumber: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="admin-field-block">
                    <span className="admin-field-label">Status</span>
                    <Select
                      items={STATUS_SELECT_ITEMS}
                      value={draft.status}
                      onValueChange={(v) => {
                        if (!v) return;
                        const nextStatus = v as InvoiceStatus;
                        setDraft((p) => ({
                          ...p,
                          status: nextStatus,
                          paidDate:
                            nextStatus === "Paid" && !p.paidDate
                              ? todayIso()
                              : p.paidDate,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {STATUS_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>

                  <div className="admin-field-block">
                    <span className="admin-field-label">Currency</span>
                    <Select
                      items={CURRENCY_SELECT_ITEMS}
                      value={draft.currency}
                      onValueChange={(v) => {
                        if (v)
                          setDraft((p) => ({
                            ...p,
                            currency: v as InvoiceCurrency,
                          }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {CURRENCY_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-issue">
                      Issue Date
                    </label>
                    <Input
                      id="inv-issue"
                      type="date"
                      size="sm"
                      value={draft.issueDate}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, issueDate: e.target.value }))
                      }
                    />
                  </div>

                  <div className="admin-field-block">
                    <div className="admin-field-row">
                      <label className="admin-field-label" htmlFor="inv-due">
                        Due Date
                      </label>
                      <div className="flex gap-1">
                        {[7, 14, 30].map((d) => (
                          <button
                            key={d}
                            type="button"
                            className="invoice-mini-chip"
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                dueDate: addDaysIso(p.issueDate, d),
                              }))
                            }
                          >
                            +{d}d
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      id="inv-due"
                      type="date"
                      size="sm"
                      value={draft.dueDate}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, dueDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Bill To / Client Section */}
              <section className="invoice-form-card">
                <div className="invoice-form-card-head">
                  <h4>Bill To</h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {clients.length > 0 && (
                      <Select
                        items={clientSelectItems}
                        value={draft.clientId || "__custom__"}
                        onValueChange={(cid) => {
                          if (!cid || cid === "__custom__") {
                            setDraft((p) => ({ ...p, clientId: "" }));
                            return;
                          }
                          const found = clients.find((c) => c.id === cid);
                          if (!found) return;
                          setDraft((p) => ({
                            ...p,
                            clientId: found.id,
                            currency: found.defaultCurrency || p.currency,
                            client: {
                              name: found.name,
                              company: found.company,
                              email: found.email,
                              phone: found.phone,
                              address: found.address,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="h-7 min-w-40 max-w-60 text-[11px]">
                          <SelectValue placeholder="Choose saved client…" />
                        </SelectTrigger>
                        <SelectPopup>
                          {clientSelectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    )}

                    {!draft.clientId && draft.client.name.trim() && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => void handleSaveCurrentBuyerToDirectory()}
                      >
                        Save client
                      </Button>
                    )}
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="c-name">
                      Client Name *
                    </label>
                    <Input
                      id="c-name"
                      size="sm"
                      placeholder="Dr. Kasun Perera"
                      value={draft.client.name}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          client: { ...p.client, name: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="c-comp">
                      Organization / Company
                    </label>
                    <Input
                      id="c-comp"
                      size="sm"
                      placeholder="Apex Robotics Labs"
                      value={draft.client.company}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          client: { ...p.client, company: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="c-email">
                      Email
                    </label>
                    <Input
                      id="c-email"
                      type="email"
                      size="sm"
                      placeholder="accounts@client.com"
                      value={draft.client.email}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          client: { ...p.client, email: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="c-phone">
                      Phone
                    </label>
                    <Input
                      id="c-phone"
                      size="sm"
                      placeholder="+94 77 000 0000"
                      value={draft.client.phone}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          client: { ...p.client, phone: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="c-addr">
                    Billing Address
                  </label>
                  <Textarea
                    id="c-addr"
                    size="sm"
                    rows={2}
                    placeholder="Street, City, Country"
                    value={draft.client.address}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        client: { ...p.client, address: e.target.value },
                      }))
                    }
                  />
                </div>
              </section>

              {/* Line Items Editor */}
              <section className="invoice-form-card">
                <div className="invoice-form-card-head">
                  <h4>Line Items ({draft.items.length})</h4>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        items: [
                          ...p.items,
                          {
                            id: newLineItemId(),
                            description: "",
                            quantity: 1,
                            unitPrice: 0,
                          },
                        ],
                      }))
                    }
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} size={12} />
                    <span>Add item</span>
                  </Button>
                </div>

                <div className="invoice-items-stack">
                  {draft.items.map((item, idx) => {
                    const lineAmt = roundMoney(
                      item.quantity * item.unitPrice,
                      draft.currency,
                    );
                    return (
                      <div key={item.id} className="invoice-item-editor">
                        <div className="invoice-item-top">
                          <span className="invoice-item-index tabular-nums">
                            #{idx + 1}
                          </span>
                          <Input
                            size="sm"
                            placeholder="Deliverable or engineering task…"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(idx, { description: e.target.value })
                            }
                            className="flex-1"
                          />
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, -1)}
                              aria-label="Move item up"
                            >
                              <HugeiconsIcon
                                icon={ArrowUp01Icon}
                                strokeWidth={2}
                                size={13}
                              />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              disabled={idx === draft.items.length - 1}
                              onClick={() => moveItem(idx, 1)}
                              aria-label="Move item down"
                            >
                              <HugeiconsIcon
                                icon={ArrowDown01Icon}
                                strokeWidth={2}
                                size={13}
                              />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              disabled={draft.items.length <= 1}
                              onClick={() => removeItem(idx)}
                              aria-label="Remove item"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                strokeWidth={2}
                                size={13}
                              />
                            </Button>
                          </div>
                        </div>

                        <div className="invoice-item-numbers tabular-nums">
                          <label className="invoice-num-field">
                            <span>Qty</span>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              size="sm"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(idx, {
                                  quantity: Math.max(
                                    0,
                                    Number(e.target.value) || 0,
                                  ),
                                })
                              }
                            />
                          </label>

                          <label className="invoice-num-field">
                            <span>Unit Price ({draft.currency})</span>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              size="sm"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(idx, {
                                  unitPrice: Math.max(
                                    0,
                                    Number(e.target.value) || 0,
                                  ),
                                })
                              }
                            />
                          </label>

                          <div className="invoice-line-total">
                            <span>Amount</span>
                            <strong>
                              {formatInvoiceMoney(lineAmt, draft.currency)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Tax, Discount, Notes & Payment Terms */}
              <section className="invoice-form-card">
                <div className="invoice-form-card-head">
                  <h4>Adjustments & Terms</h4>
                </div>

                <div className="admin-field-grid-3 tabular-nums">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-tax">
                      Tax Rate (%)
                    </label>
                    <Input
                      id="inv-tax"
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      size="sm"
                      value={draft.taxRate}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          taxRate: Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0),
                          ),
                        }))
                      }
                    />
                  </div>

                  <div className="admin-field-block">
                    <span className="admin-field-label">Discount Mode</span>
                    <Select
                      items={discountModeSelectItems}
                      value={draft.discountType}
                      onValueChange={(v) => {
                        if (v)
                          setDraft((p) => ({
                            ...p,
                            discountType: v as DiscountType,
                          }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {discountModeSelectItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>

                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-disc">
                      Discount{" "}
                      {draft.discountType === "percent"
                        ? "(%)"
                        : `(${draft.currency})`}
                    </label>
                    <Input
                      id="inv-disc"
                      type="number"
                      min={0}
                      step="any"
                      size="sm"
                      value={draft.discountValue}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          discountValue: Math.max(
                            0,
                            Number(e.target.value) || 0,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-notes">
                      Notes
                    </label>
                    <Textarea
                      id="inv-notes"
                      size="sm"
                      rows={3}
                      value={draft.notes}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, notes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="inv-terms">
                      Payment Details & Terms
                    </label>
                    <Textarea
                      id="inv-terms"
                      size="sm"
                      rows={3}
                      value={draft.paymentTerms}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          paymentTerms: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Right Live A4 Preview + Client PDF Bar */}
          <div className="invoice-preview-pane">
            <div className="invoice-preview-bar">
              <div className="invoice-preview-total tabular-nums">
                <span>Total:</span>
                <strong>
                  {formatInvoiceMoney(draftTotals.total, draft.currency)}
                </strong>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="ghost"
                  loading={pdfBusyId === "composer-preview"}
                  onClick={() =>
                    void handlePreviewPdf(draft, "composer-preview")
                  }
                >
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    strokeWidth={2}
                    size={13}
                  />
                  <span>Open PDF</span>
                </Button>

                <Button
                  size="xs"
                  variant="outline"
                  loading={pdfBusyId === "composer-dl"}
                  onClick={() => void handleExportPdf(draft, "composer-dl")}
                >
                  <HugeiconsIcon
                    icon={Download04Icon}
                    strokeWidth={2}
                    size={13}
                  />
                  <span>Download PDF</span>
                </Button>

                <Button
                  size="xs"
                  loading={savingInvoice}
                  onClick={() => void handleSaveInvoice()}
                >
                  <span>{editingId ? "Save Changes" : "Save Invoice"}</span>
                </Button>
              </div>
            </div>

            <div className="invoice-preview-stage">
              <InvoicePaperPreview invoice={draft} settings={settings} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Client Directory */}
      {tab === "clients" && (
        <div className="invoice-clients-layout">
          <form
            className="invoice-client-editor"
            onSubmit={handleSubmitClientForm}
          >
            <div className="invoice-form-card-head">
              <h4>{editingClientId ? "Edit Client" : "Add Client"}</h4>
              {editingClientId && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setEditingClientId(null);
                    setClientForm(EMPTY_CLIENT_FORM);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="admin-form-stack">
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="dir-name">
                  Full Name / Contact *
                </label>
                <Input
                  id="dir-name"
                  size="sm"
                  value={clientForm.name}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Client contact name"
                />
              </div>

              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="dir-company">
                  Company / Institution
                </label>
                <Input
                  id="dir-company"
                  size="sm"
                  value={clientForm.company}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, company: e.target.value }))
                  }
                  placeholder="Company name"
                />
              </div>

              <div className="admin-field-grid-2">
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="dir-email">
                    Email
                  </label>
                  <Input
                    id="dir-email"
                    type="email"
                    size="sm"
                    value={clientForm.email}
                    onChange={(e) =>
                      setClientForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="dir-phone">
                    Phone
                  </label>
                  <Input
                    id="dir-phone"
                    size="sm"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="admin-field-block">
                <span className="admin-field-label">Default Currency</span>
                <Select
                  items={CURRENCY_SELECT_ITEMS}
                  value={clientForm.defaultCurrency}
                  onValueChange={(v) => {
                    if (v)
                      setClientForm((p) => ({
                        ...p,
                        defaultCurrency: v as InvoiceCurrency,
                      }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {CURRENCY_SELECT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>

              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="dir-addr">
                  Billing Address
                </label>
                <Textarea
                  id="dir-addr"
                  size="sm"
                  rows={2}
                  value={clientForm.address}
                  onChange={(e) =>
                    setClientForm((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>

              <Button type="submit" size="sm" loading={savingClient}>
                {editingClientId ? "Update Client" : "Save to Directory"}
              </Button>
            </div>
          </form>

          <div className="invoice-clients-list-pane">
            {clients.length === 0 ? (
              <div className="invoice-empty-state">
                <p>
                  No saved clients yet. Add recurring recipients on the left.
                </p>
              </div>
            ) : (
              <div className="invoice-client-cards">
                {clients.map((c) => (
                  <div key={c.id} className="invoice-client-card">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-sm">{c.name}</strong>
                        <span className="admin-chip-btn is-static">
                          {c.defaultCurrency}
                        </span>
                      </div>
                      {c.company && (
                        <p className="text-xs font-medium text-[var(--muted-ink)]">
                          <HugeiconsIcon
                            icon={Building03Icon}
                            strokeWidth={1.8}
                            size={12}
                            className="mr-1 inline"
                          />
                          {c.company}
                        </p>
                      )}
                      {(c.email || c.phone) && (
                        <p className="mt-1 text-xs text-[var(--muted-ink)]">
                          {[c.email, c.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {c.address && (
                        <p className="mt-1 text-xs text-[var(--muted-ink)] whitespace-pre-line">
                          {c.address}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => startNewInvoice(c)}
                      >
                        New invoice
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => {
                          setEditingClientId(c.id);
                          setClientForm({
                            name: c.name,
                            company: c.company,
                            email: c.email,
                            phone: c.phone,
                            address: c.address,
                            defaultCurrency: c.defaultCurrency,
                            notes: c.notes,
                          });
                        }}
                      >
                        <HugeiconsIcon
                          icon={PencilEdit01Icon}
                          strokeWidth={2}
                          size={13}
                        />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => void handleDeleteClient(c)}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          strokeWidth={2}
                          size={13}
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Business Profile & Numbering Defaults */}
      {tab === "settings" && (
        <div className="invoice-pane-scroll">
          <form className="invoice-settings-form" onSubmit={handleSaveSettings}>
            <section className="invoice-form-card">
              <div className="invoice-form-card-head">
                <h4>Sender & Business Identity</h4>
                <div className="flex items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <HugeiconsIcon
                      icon={Upload04Icon}
                      strokeWidth={2}
                      size={13}
                    />
                    <span>Upload Logo</span>
                  </Button>
                  {settings.logoUrl !== "/favicon-pm.svg" && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          logoUrl: "/favicon-pm.svg",
                        }))
                      }
                    >
                      Use PM Mark
                    </Button>
                  )}
                </div>
              </div>

              <div className="admin-field-grid-2">
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-bname">
                    Business / Sender Name
                  </label>
                  <Input
                    id="s-bname"
                    size="sm"
                    value={settings.businessName}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        businessName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-tag">
                    Professional Tagline
                  </label>
                  <Input
                    id="s-tag"
                    size="sm"
                    value={settings.tagline}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, tagline: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="admin-field-grid-3">
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-email">
                    Email
                  </label>
                  <Input
                    id="s-email"
                    type="email"
                    size="sm"
                    value={settings.email}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-phone">
                    Phone
                  </label>
                  <Input
                    id="s-phone"
                    size="sm"
                    value={settings.phone}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-web">
                    Website
                  </label>
                  <Input
                    id="s-web"
                    size="sm"
                    value={settings.website}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, website: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="s-addr">
                  Business Address
                </label>
                <Textarea
                  id="s-addr"
                  size="sm"
                  rows={2}
                  value={settings.address}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>
            </section>

            <section className="invoice-form-card">
              <div className="invoice-form-card-head">
                <h4>Numbering, Currency & Payment Defaults</h4>
              </div>

              <div className="admin-field-grid-4 tabular-nums">
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-prefix">
                    Invoice Prefix
                  </label>
                  <Input
                    id="s-prefix"
                    size="sm"
                    value={settings.invoicePrefix}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        invoicePrefix: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-pad">
                    Zero Padding
                  </label>
                  <Input
                    id="s-pad"
                    type="number"
                    min={2}
                    max={8}
                    size="sm"
                    value={settings.invoicePadding}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        invoicePadding: Math.min(
                          8,
                          Math.max(2, Number(e.target.value) || 4),
                        ),
                      }))
                    }
                  />
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Primary Currency</span>
                  <Select
                    items={CURRENCY_SHORT_SELECT_ITEMS}
                    value={settings.defaultCurrency}
                    onValueChange={(v) => {
                      if (v)
                        setSettings((p) => ({
                          ...p,
                          defaultCurrency: v as InvoiceCurrency,
                        }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {CURRENCY_SHORT_SELECT_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-tax">
                    Default Tax (%)
                  </label>
                  <Input
                    id="s-tax"
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    size="sm"
                    value={settings.defaultTaxRate}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        defaultTaxRate: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="admin-field-grid-2">
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-dnotes">
                    Default Notes
                  </label>
                  <Textarea
                    id="s-dnotes"
                    size="sm"
                    rows={3}
                    value={settings.defaultNotes}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        defaultNotes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="s-dterms">
                    Default Bank / Payment Terms
                  </label>
                  <Textarea
                    id="s-dterms"
                    size="sm"
                    rows={3}
                    value={settings.defaultPaymentTerms}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        defaultPaymentTerms: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={savingSettings}>
                  Save Workspace Defaults
                </Button>
              </div>
            </section>
          </form>
        </div>
      )}
    </div>
  );
}
