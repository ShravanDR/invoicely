"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Copy, Download, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Select } from "@/components/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_COLOURS, INVOICE_STATUSES, getCurrentFYStartYear, getFYOptions } from "@/lib/constants";

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  description: string;
  invoicePart: number | null;
  sequenceId: string | null;
  client: { id: string; name: string };
}

interface Client {
  id: string;
  name: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [fyStart, setFyStart] = useState(getCurrentFYStartYear());
  const [sortKey, setSortKey] = useState<"number" | "client" | "date" | "amount" | "status">("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "amount" || key === "number" ? "desc" : "asc");
    }
  }

  const statusOrder: Record<string, number> = { draft: 0, sent: 1, paid: 2, cancelled: 3 };

  const filteredInvoices = search
    ? invoices.filter((inv) => {
        const q = search.toLowerCase();
        return (
          (inv.number && inv.number.toLowerCase().includes(q)) ||
          inv.client.name.toLowerCase().includes(q) ||
          inv.description.toLowerCase().includes(q)
        );
      })
    : invoices;

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "number":
        // nulls (drafts) first when desc, last when asc
        if (!a.number && !b.number) cmp = 0;
        else if (!a.number) cmp = -1;
        else if (!b.number) cmp = 1;
        else cmp = a.number.localeCompare(b.number);
        break;
      case "client":
        cmp = a.client.name.localeCompare(b.client.name);
        break;
      case "date":
        cmp = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
        break;
      case "amount":
        cmp = a.amount - b.amount;
        break;
      case "status":
        cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ fyStart: fyStart.toString() });
    if (status) params.set("status", status);
    if (clientId) params.set("clientId", clientId);

    fetch(`/api/invoices?${params}`)
      .then((r) => r.json())
      .then(setInvoices)
      .catch(console.error);
  }, [status, clientId, fyStart]);

  async function updateStatus(invoiceId: string, newStatus: string) {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: updated.status, number: updated.number } : inv))
      );
    }
  }

  const fyOptions = getFYOptions(2024);


  // For "X of N" labels: count how many invoices share each sequenceId
  const sequenceCounts: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.sequenceId) {
      sequenceCounts[inv.sequenceId] = (sequenceCounts[inv.sequenceId] || 0) + 1;
    }
  }

  async function createNextPart(sourceId: string) {
    const res = await fetch(`/api/invoices/${sourceId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asNextPart: true }),
    });
    if (res.ok) {
      const newInvoice = await res.json();
      router.push(`/invoices/${newInvoice.id}`);
    }
  }

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = invoices.length > 0 && selected.size === invoices.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((inv) => inv.id)));
    }
  }

  const selectedInvoices = invoices.filter((inv) => selected.has(inv.id));
  const selectedDrafts = selectedInvoices.filter((inv) => inv.status === "draft");
  const selectedFinalized = selectedInvoices.filter((inv) => inv.status !== "draft");

  async function bulkDownload() {
    // Download PDFs sequentially to avoid hammering puppeteer
    for (const inv of selectedFinalized) {
      const a = document.createElement("a");
      a.href = `/api/invoices/${inv.id}/pdf?download=1`;
      a.download = `Invoice-${inv.number || "DRAFT"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Small delay between downloads so browser handles each
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedDrafts.length} draft${selectedDrafts.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await Promise.all(
      selectedDrafts.map((inv) => fetch(`/api/invoices/${inv.id}`, { method: "DELETE" }))
    );
    setInvoices((prev) => prev.filter((inv) => !selected.has(inv.id) || inv.status !== "draft"));
    setSelected(new Set());
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold tracking-tight">Invoices</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-56"
          />
        </div>
        <Select
          value={fyStart}
          onChange={(e) => setFyStart(parseInt(e.target.value))}
        >
          {fyOptions.map((label) => {
            const year = parseInt(label.split(" ")[1].split("-")[0]);
            return (
              <option key={year} value={year}>
                {label}
              </option>
            );
          })}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="pl-5 pr-2 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                />
              </th>
              {([
                { key: "number" as const, label: "#", align: "left" },
                { key: "client" as const, label: "Client", align: "left" },
                { key: "date" as const, label: "Date", align: "left" },
                { key: "amount" as const, label: "Amount", align: "right" },
                { key: "status" as const, label: "Status", align: "left" },
              ]).map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sortedInvoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
                className={`group border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${selected.has(inv.id) ? "bg-primary/[0.04]" : ""}`}
              >
                <td className="pl-5 pr-2 py-3.5 w-8" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggleSelect(inv.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-primary">
                  <span>{inv.number ?? "DRAFT"}</span>
                  {inv.invoicePart && inv.sequenceId && (
                    <span className="ml-1.5 text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {inv.invoicePart} of {sequenceCounts[inv.sequenceId] || inv.invoicePart}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium">{inv.client.name}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">
                  {formatDate(inv.invoiceDate)}
                </td>
                <td className="px-5 py-3.5 text-sm text-right font-semibold">
                  {formatCurrency(inv.amount)}
                </td>
                <td className="px-5 py-3.5 text-sm" onClick={(e) => e.stopPropagation()}>
                  <StatusChip
                    status={inv.status}
                    onChangeStatus={(newStatus) => updateStatus(inv.id, newStatus)}
                  />
                </td>
                <td className="pr-4 py-3.5 w-8" onClick={(e) => e.stopPropagation()}>
                  {(inv.status === "sent" || inv.status === "paid") && (
                    <button
                      onClick={() => createNextPart(inv.id)}
                      className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-primary hover:bg-accent transition-all opacity-0 group-hover:opacity-100"
                      title="Create next part"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Create your first invoice to get started
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border bg-white px-5 py-3 shadow-xl ring-1 ring-black/[0.04]">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          {selectedFinalized.length > 0 && (
            <button
              onClick={bulkDownload}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download {selectedFinalized.length} PDF{selectedFinalized.length > 1 ? "s" : ""}
            </button>
          )}
          {selectedDrafts.length > 0 && (
            <button
              onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedDrafts.length} draft{selectedDrafts.length > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "#fee2e2", text: "#b91c1c", dot: "#f87171" },
  sent: { bg: "#fef9c3", text: "#854d0e", dot: "#facc15" },
  paid: { bg: "#dcfce7", text: "#166534", dot: "#4ade80" },
  cancelled: { bg: "#f3f4f6", text: "#525252", dot: "#a3a3a3" },
};

function StatusChip({
  status,
  onChangeStatus,
}: {
  status: string;
  onChangeStatus: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  // Valid transitions: draft→sent, sent→paid, sent→cancelled
  const transitionMap: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
  };
  const nextStatuses = transitionMap[status] || [];
  const style = STATUS_STYLES[status];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 4, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        style={style ? { backgroundColor: style.bg, color: style.text } : {}}
        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize cursor-pointer hover:opacity-80 transition-opacity"
      >
        {status}
      </button>
      {open && nextStatuses.length > 0 && pos && (
        <div
          ref={menuRef}
          className="fixed z-[100] rounded-xl border bg-white shadow-lg ring-1 ring-black/[0.04] py-1 min-w-[120px]"
          style={{ top: pos.top, right: pos.right, transform: "translateY(-100%)" }}
        >
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChangeStatus(s);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors capitalize"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_STYLES[s]?.dot }}
              />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
