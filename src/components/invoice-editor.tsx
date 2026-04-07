"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, toInputDate } from "@/lib/utils";
import { STATUS_COLOURS, TDS_SECTIONS } from "@/lib/constants";
import {
  ArrowLeft,
  Download,
  Trash2,
  Send,
  Copy,
  Plus,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { Select } from "@/components/select";
import { Combobox } from "@/components/combobox";
import { RichTextarea } from "@/components/rich-textarea";

// --- Types ---

interface LineItem {
  id?: string;
  description: string;
  details?: string;
  qty: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  number: string | null;
  description: string;
  amount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  tdsSection: string | null;
  tdsRate: number | null;
  tdsAmount: number | null;
  netReceived: number | null;
  notes: string | null;
  lineItems: LineItem[];
  client: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
  };
}

interface Client {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
  isDefault: boolean;
}

// --- Shared input styles ---

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary/30";
const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider";
const sectionClass = "space-y-4";

// --- Main Editor Component ---

interface InvoiceEditorProps {
  invoice?: Invoice | null; // null/undefined = creating new
  mode: "create" | "view";
}

export function InvoiceEditor({ invoice, mode }: InvoiceEditorProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", address: "" });
  const [savingClient, setSavingClient] = useState(false);

  async function saveNewClient() {
    if (!newClient.name.trim()) return;
    setSavingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        const created = await res.json();
        setClients((prev) => [...prev, created]);
        setFormData((prev) => ({
          ...prev,
          clientId: created.id,
          clientName: created.name,
          clientEmail: created.email || "",
          clientAddress: created.address || "",
        }));
        setShowNewClient(false);
        setNewClient({ name: "", email: "", address: "" });
      }
    } finally {
      setSavingClient(false);
    }
  }
  const [business, setBusiness] = useState({ name: "", address: "", phone: "", bank: "", ifsc: "", accountNo: "", pan: "" });

  // Form state for live preview
  const [formData, setFormData] = useState({
    clientId: invoice?.client?.id || "",
    clientName: invoice?.client?.name || "",
    clientEmail: invoice?.client?.email || "",
    clientAddress: invoice?.client?.address || "",
    description: invoice?.description || "",
    amount: invoice?.amount?.toString() || "",
    invoiceDate: invoice ? toInputDate(invoice.invoiceDate) : toInputDate(new Date()),
    dueDate: invoice ? toInputDate(invoice.dueDate) : toInputDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    notes: invoice?.notes || (mode === "create" ? "Work will resume after advance payment of 50%" : ""),
  });

  const defaultLineItem = (): LineItem => ({ description: "", qty: 1, rate: 0, amount: 0 });
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.lineItems?.length ? invoice.lineItems : [defaultLineItem()]
  );
  const hasMultipleItems = lineItems.length > 1 || (lineItems.length === 1 && lineItems[0].description !== "");

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "description") item.description = value as string;
      else if (field === "details") item.details = value as string;
      else if (field === "qty") item.qty = Number(value) || 0;
      else if (field === "rate") item.rate = Number(value) || 0;
      item.amount = item.qty * item.rate;
      updated[index] = item;

      // Update total amount in formData
      const total = updated.reduce((s, li) => s + li.amount, 0);
      setFormData((prev) => ({ ...prev, amount: total.toString() }));

      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, defaultLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) return [defaultLineItem()];
      const total = updated.reduce((s, li) => s + li.amount, 0);
      setFormData((p) => ({ ...p, amount: total.toString() }));
      return updated;
    });
  }

  // Preview iframe ref for live updates
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setBusiness(data.business))
      .catch(console.error);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => {
        setClients(data);
        if (mode === "create" && !formData.clientId) {
          const defaultClient = data.find((c) => c.isDefault);
          if (defaultClient) {
            setFormData((prev) => ({
              ...prev,
              clientId: defaultClient.id,
              clientName: defaultClient.name,
              clientEmail: defaultClient.email || "",
              clientAddress: defaultClient.address || "",
            }));
          }
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form data when invoice prop changes (e.g. after save)
  useEffect(() => {
    if (invoice) {
      setFormData({
        clientId: invoice.client?.id || "",
        clientName: invoice.client?.name || "",
        clientEmail: invoice.client?.email || "",
        clientAddress: invoice.client?.address || "",
        description: invoice.description,
        amount: invoice.amount.toString(),
        invoiceDate: toInputDate(invoice.invoiceDate),
        dueDate: toInputDate(invoice.dueDate),
        notes: invoice.notes || "",
      });
      setLineItems(invoice.lineItems?.length ? invoice.lineItems : [defaultLineItem()]);
    }
  }, [invoice]);

  const updateField = useCallback((field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-set due date to 7 days after invoice date
      if (field === "invoiceDate" && value) {
        const d = new Date(value + "T00:00:00");
        d.setDate(d.getDate() + 7);
        updated.dueDate = toInputDate(d);
      }
      if (field === "clientId") {
        // We'll need the clients array here, but this is fine since it's stable
      }
      return updated;
    });
  }, []);

  const updateClientId = useCallback(
    (id: string) => {
      const client = clients.find((c) => c.id === id);
      setFormData((prev) => ({
        ...prev,
        clientId: id,
        clientName: client?.name || "",
        clientEmail: client?.email || "",
        clientAddress: client?.address || "",
      }));
    },
    [clients]
  );

  // Debounced preview refresh for non-draft invoices (sent/paid/cancelled use iframe src)
  useEffect(() => {
    if (invoice && invoice.status !== "draft" && previewRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = `/api/invoices/${invoice.id}/pdf?t=${Date.now()}`;
        }
      }, 500);
    }
  }, [invoice]);

  const isDraft = !invoice || invoice.status === "draft";
  const isEditable = isDraft;
  const invoiceLabel = invoice?.number
    ? `Invoice ${invoice.number}`
    : "New Invoice";

  // --- Handlers ---

  async function handleDuplicate() {
    if (!invoice) return;
    const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      router.push(`/invoices/${dup.id}`);
    }
  }

  async function handleSave() {
    setSaving(true);
    const validItems = lineItems.filter((li) => li.description && li.rate > 0);
    const payload: Record<string, unknown> = {
      clientId: formData.clientId,
      description: validItems.length > 0 ? validItems[0].description : formData.description,
      amount: formData.amount,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      notes: formData.notes,
      lineItems: validItems.map((li) => ({ description: li.description, details: li.details || "", qty: li.qty, rate: li.rate })),
    };

    if (mode === "create") {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/invoices/${created.id}`);
        return;
      }
    } else if (invoice) {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
      }
    }
    setSaving(false);
  }

  async function handleFinalize() {
    if (!invoice) return;
    if (
      !confirm(
        "Finalize this invoice? This assigns an invoice number and marks it as Sent."
      )
    )
      return;
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!confirm("Delete this draft?")) return;
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/invoices");
  }

  // --- Live preview via server-side template rendering ---

  const [previewHtml, setPreviewHtml] = useState("");
  const previewDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Debounced preview update for new invoices and editable drafts
  useEffect(() => {
    if (invoice && invoice.status !== "draft") return; // Non-draft invoices use iframe src
    clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(async () => {
      const validItems = lineItems.filter((li) => li.description || li.rate > 0);
      const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceNumber: invoice?.number || "DRAFT",
            invoiceDate: fmtDate(formData.invoiceDate),
            dueDate: fmtDate(formData.dueDate),
            status: "draft",
            clientName: formData.clientName,
            clientEmail: formData.clientEmail,
            clientAddress: formData.clientAddress,
            items: validItems.length > 0
              ? validItems.map((li) => ({ description: li.description, details: li.details, qty: li.qty, rate: li.rate, amount: li.amount }))
              : [{ description: formData.description || "—", details: null, qty: 1, rate: parseFloat(formData.amount) || 0, amount: parseFloat(formData.amount) || 0 }],
            total: parseFloat(formData.amount) || 0,
            notes: formData.notes,
          }),
        });
        if (res.ok) setPreviewHtml(await res.text());
      } catch { /* ignore preview errors */ }
    }, 400);
  }, [formData, lineItems, invoice]);

  // --- Render ---

  return (
    <div className="flex h-screen">
      {/* LEFT PANEL — Editor */}
      <div className="w-[440px] min-w-[400px] flex flex-col border-r bg-[hsl(var(--editor-bg))]">
        {/* Editor Header */}
        <div className="flex items-center gap-3 px-5 h-14 border-b bg-card/80 backdrop-blur-sm shrink-0">
          <Link
            href="/invoices"
            className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <h1 className="text-sm font-serif font-semibold truncate">{invoiceLabel}</h1>
            {invoice && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                style={{
                  backgroundColor: { draft: "#fee2e2", sent: "#fef9c3", paid: "#dcfce7", cancelled: "#f3f4f6" }[invoice.status] || "#f3f4f6",
                  color: { draft: "#b91c1c", sent: "#854d0e", paid: "#166534", cancelled: "#525252" }[invoice.status] || "#525252",
                }}
              >
                {invoice.status}
              </span>
            )}
          </div>
          {invoice && !isDraft && (
            <button
              onClick={handleDuplicate}
              className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground"
              title="Duplicate as new draft"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {invoice && (
            <a
              href={`/api/invoices/${invoice.id}/pdf?download=1`}
              download
              className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isEditable ? (
            <>
              {/* Client */}
              <div className={sectionClass}>
                <label className={labelClass}>Client</label>
                <Combobox
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  value={formData.clientId}
                  onChange={(id) => updateClientId(id)}
                  placeholder="Search clients..."
                  addNewLabel="Add new client"
                  onAddNew={() => setShowNewClient(true)}
                />
                {showNewClient && (
                  <div className="rounded-xl border bg-white p-3 space-y-2 mt-2">
                    <input
                      value={newClient.name}
                      onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                      className={inputClass}
                      placeholder="Client name *"
                      autoFocus
                    />
                    <input
                      value={newClient.email}
                      onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                      placeholder="Email (optional)"
                    />
                    <input
                      value={newClient.address}
                      onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))}
                      className={inputClass}
                      placeholder="Address (optional)"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={saveNewClient}
                        disabled={!newClient.name.trim() || savingClient}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
                      >
                        {savingClient ? "Saving..." : "Add Client"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewClient(false); setNewClient({ name: "", email: "", address: "" }); }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Line Items</label>
                </div>
                {lineItems.map((li, i) => (
                  <div key={i} className="rounded-xl border bg-white p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        value={li.description}
                        onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        className={`${inputClass} flex-1`}
                        placeholder="Description"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(i)}
                          className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <RichTextarea
                      value={li.details || ""}
                      onChange={(v) => updateLineItem(i, "details", v)}
                      rows={2}
                      className={`${inputClass} resize-none text-xs text-muted-foreground`}
                      placeholder="Scope details (optional)"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Qty</span>
                        <input
                          type="number"
                          value={li.qty}
                          onChange={(e) => updateLineItem(i, "qty", e.target.value)}
                          className={`${inputClass} mt-0.5`}
                          min="1"
                          step="1"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Rate (₹)</span>
                        <input
                          type="number"
                          value={li.rate || ""}
                          onChange={(e) => updateLineItem(i, "rate", e.target.value)}
                          className={`${inputClass} mt-0.5`}
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Amount</span>
                        <p className="mt-2.5 text-sm font-medium">
                          {formatCurrency(li.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add line item
                </button>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className={labelClass}>Total</span>
                  <span className="text-lg font-serif font-semibold">
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className={sectionClass}>
                  <label className={labelClass}>Invoice Date</label>
                  <DatePicker
                    value={formData.invoiceDate}
                    onChange={(v) => updateField("invoiceDate", v)}
                  />
                </div>
                <div className={sectionClass}>
                  <label className={labelClass}>Due Date</label>
                  <DatePicker
                    value={formData.dueDate}
                    onChange={(v) => updateField("dueDate", v)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className={sectionClass}>
                <label className={labelClass}>Notes / Terms</label>
                <RichTextarea
                  value={formData.notes}
                  onChange={(v) => updateField("notes", v)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Terms & conditions, payment notes..."
                />
              </div>
            </>
          ) : (
            /* Read-only view for sent/paid invoices */
            <div className="space-y-5">
              <ReadOnlyField label="Client" value={invoice?.client.name} />
              {invoice?.lineItems && invoice.lineItems.length > 0 ? (
                <div>
                  <p className={labelClass}>Line Items</p>
                  <div className="mt-1.5 space-y-2">
                    {invoice.lineItems.map((li, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{li.description}</span>
                        <span className="text-muted-foreground">
                          {li.qty} x {formatCurrency(li.rate)} = {formatCurrency(li.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Total</span>
                      <span className="text-lg font-serif font-semibold">{formatCurrency(invoice.amount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ReadOnlyField label="Description" value={invoice?.description} />
                  <ReadOnlyField
                    label="Amount"
                    value={formatCurrency(invoice?.amount || 0)}
                    large
                  />
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField
                  label="Invoice Date"
                  value={invoice ? formatDate(invoice.invoiceDate) : ""}
                />
                <ReadOnlyField
                  label="Due Date"
                  value={invoice ? formatDate(invoice.dueDate) : ""}
                />
              </div>
              {invoice?.paidDate && (
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField
                    label="Paid Date"
                    value={formatDate(invoice.paidDate)}
                  />
                  {invoice.netReceived != null && (
                    <ReadOnlyField
                      label="Net Received"
                      value={formatCurrency(invoice.netReceived)}
                      className="text-green-700"
                    />
                  )}
                </div>
              )}
              {invoice?.tdsAmount != null && (
                <ReadOnlyField
                  label="TDS Deducted"
                  value={`${formatCurrency(invoice.tdsAmount)}${invoice.tdsSection ? ` (Section ${invoice.tdsSection}${invoice.tdsRate ? ` @ ${invoice.tdsRate}%` : ""})` : ""}`}
                  className="text-orange-600"
                />
              )}
              {invoice?.notes && (
                <ReadOnlyField label="Notes" value={invoice.notes} />
              )}
            </div>
          )}

          {/* Payment Form (for Sent invoices) */}
          {invoice?.status === "sent" && showPaymentForm && (
            <PaymentForm
              invoiceAmount={invoice.amount}
              invoiceId={invoice.id}
              onComplete={() => {
                setShowPaymentForm(false);
                router.refresh();
              }}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}
        </div>

        {/* Editor Footer — Actions */}
        <div className="shrink-0 px-5 py-4 border-t bg-card/80 backdrop-blur-sm">
          {isEditable && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !formData.clientId || !formData.amount || parseFloat(formData.amount) <= 0}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                {saving
                  ? "Saving..."
                  : mode === "create"
                    ? "Create Draft"
                    : "Save Changes"}
              </button>
              {invoice && isDraft && (
                <button
                  onClick={handleFinalize}
                  className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-all"
                >
                  <Send className="h-3.5 w-3.5 inline mr-1.5" />
                  Finalize
                </button>
              )}
              {invoice && isDraft && (
                <button
                  onClick={handleDelete}
                  className="rounded-xl p-2.5 text-destructive hover:bg-destructive/10 transition-all"
                  title="Delete draft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {invoice?.status === "sent" && !showPaymentForm && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Record Payment
            </button>
          )}
          {invoice?.status === "paid" && (
            <div className="text-center text-sm text-green-600 font-medium py-1">
              Paid on {formatDate(invoice.paidDate!)}
            </div>
          )}
          {invoice?.status === "cancelled" && (
            <div className="text-center text-sm text-gray-500 font-medium py-1">
              This invoice has been cancelled
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Live Preview */}
      <div className="flex-1 flex flex-col bg-[hsl(var(--preview-bg))]">
        <div className="flex items-center h-14 px-6 border-b bg-white/50 backdrop-blur-sm shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview
          </p>
        </div>
        <div className="flex-1 p-6 overflow-auto preview-panel">
          <div className="mx-auto max-w-[680px] rounded-2xl shadow-md ring-1 ring-black/[0.04] overflow-hidden bg-white">
            {invoice && invoice.status !== "draft" ? (
              <iframe
                ref={previewRef}
                src={`/api/invoices/${invoice.id}/pdf`}
                className="w-full border-0"
                style={{ height: "900px" }}
              />
            ) : (
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{ height: "900px" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function ReadOnlyField({
  label,
  value,
  large,
  className,
}: {
  label: string;
  value?: string | null;
  large?: boolean;
  className?: string;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p
        className={`mt-1 ${large ? "text-xl font-serif font-semibold" : "text-sm font-medium"} ${className || ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// --- Payment Form ---

function PaymentForm({
  invoiceAmount,
  invoiceId,
  onComplete,
  onCancel,
}: {
  invoiceAmount: number;
  invoiceId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [tdsSection, setTdsSection] = useState("194J");
  const [tdsRate, setTdsRate] = useState(10);
  const [tdsAmount, setTdsAmount] = useState(Math.round(invoiceAmount * 0.1));
  const [netReceived, setNetReceived] = useState(
    Math.round(invoiceAmount * 0.9)
  );
  const [paidDate, setPaidDate] = useState(toInputDate(new Date()));

  function handleSectionChange(code: string) {
    setTdsSection(code);
    if (code === "none") {
      setTdsRate(0);
      setTdsAmount(0);
      setNetReceived(invoiceAmount);
      return;
    }
    const preset = TDS_SECTIONS.find((s) => s.code === code);
    if (preset) {
      setTdsRate(preset.rate);
      const tds = Math.round((invoiceAmount * preset.rate) / 100);
      setTdsAmount(tds);
      setNetReceived(invoiceAmount - tds);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "paid",
        paidDate,
        tdsSection: tdsSection === "none" ? null : tdsSection,
        tdsRate: tdsSection === "none" ? null : String(tdsRate),
        tdsAmount: String(tdsAmount),
        netReceived: String(netReceived),
      }),
    });
    if (res.ok) onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Payment Details
      </p>
      <div>
        <label className={labelClass}>Date Received</label>
        <DatePicker
          value={paidDate}
          onChange={(v) => setPaidDate(v)}
        />
      </div>
      <div>
        <label className={labelClass}>TDS Section</label>
        <Select
          value={tdsSection}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="w-full !rounded-xl"
        >
          {TDS_SECTIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} — {s.description} ({s.rate}%)
            </option>
          ))}
          <option value="none">No TDS</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>TDS ({tdsRate}%)</label>
          <input
            type="number"
            value={tdsAmount}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTdsAmount(v);
              setNetReceived(invoiceAmount - v);
            }}
            required
            step="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Net Received</label>
          <input
            type="number"
            value={netReceived}
            onChange={(e) => {
              const v = Number(e.target.value);
              setNetReceived(v);
              setTdsAmount(invoiceAmount - v);
            }}
            required
            step="1"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Confirm Payment
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
