"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Select } from "@/components/select";
import { getCurrentFYStartYear, getFYOptions } from "@/lib/constants";
import OrbitalLoader from "@/components/orbital-loader";

interface TDSReport {
  fyLabel: string;
  grandTotals: {
    totalInvoiced: number;
    totalTDS: number;
    totalNetReceived: number;
    invoiceCount: number;
  };
  clientSummary: {
    clientId: string;
    clientName: string;
    invoiceCount: number;
    totalInvoiced: number;
    totalTDS: number;
    totalNetReceived: number;
    sections: { code: string; tdsAmount: number; invoiceCount: number }[];
  }[];
  sectionSummary: {
    code: string;
    tdsAmount: number;
    invoiceCount: number;
    totalInvoiced: number;
  }[];
  invoices: {
    id: string;
    number: number | null;
    clientName: string;
    description: string;
    invoiceDate: string;
    paidDate: string | null;
    amount: number;
    tdsSection: string | null;
    tdsRate: number | null;
    tdsAmount: number | null;
    netReceived: number | null;
  }[];
}

export default function TDSReportPage() {
  const [report, setReport] = useState<TDSReport | null>(null);
  const [fyStart, setFyStart] = useState(getCurrentFYStartYear());
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/reports/tds?fyStart=${fyStart}`)
      .then((r) => r.json())
      .then(setReport)
      .catch(console.error);
  }, [fyStart]);

  const fyOptions = getFYOptions(2024);

  if (!report) {
    return <div className="flex h-64 items-center justify-center"><OrbitalLoader size={64} /></div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight">TDS Receivables Summary</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{report.fyLabel} — for Form 26AS reconciliation</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client..."
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
              <option key={year} value={year}>{label}</option>
            );
          })}
        </Select>
      </div>

      {/* Grand Totals */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Invoiced</p>
          <p className="mt-2 text-2xl font-serif font-semibold">{formatCurrency(report.grandTotals.totalInvoiced)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total TDS Deducted</p>
          <p className="mt-2 text-2xl font-serif font-semibold text-orange-600">{formatCurrency(report.grandTotals.totalTDS)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Net Received</p>
          <p className="mt-2 text-2xl font-serif font-semibold text-green-600">{formatCurrency(report.grandTotals.totalNetReceived)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Paid Invoices</p>
          <p className="mt-2 text-2xl font-serif font-semibold text-blue-600">{report.grandTotals.invoiceCount}</p>
        </div>
      </div>

      {/* Section-wise Summary */}
      {report.sectionSummary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">By TDS Section</h2>
          <div className="rounded-2xl border shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Section</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Invoices</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Invoiced</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">TDS Deducted</th>
                </tr>
              </thead>
              <tbody>
                {report.sectionSummary.map((s) => (
                  <tr key={s.code} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{s.code}</td>
                    <td className="px-4 py-3 text-sm text-right">{s.invoiceCount}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(s.totalInvoiced)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{formatCurrency(s.tdsAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client-wise Summary */}
      {report.clientSummary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">By Client</h2>
          <div className="rounded-2xl border shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">TDS Sections</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Invoices</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Invoiced</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">TDS Deducted</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Net Received</th>
                </tr>
              </thead>
              <tbody>
                {report.clientSummary.filter((c) => !search || c.clientName.toLowerCase().includes(search.toLowerCase())).map((c) => (
                  <tr key={c.clientId} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">{c.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {c.sections.map((s) => `${s.code} (${formatCurrency(s.tdsAmount)})`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{c.invoiceCount}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(c.totalInvoiced)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{formatCurrency(c.totalTDS)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(c.totalNetReceived)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail Table */}
      {report.invoices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Invoice Details</h2>
          <div className="rounded-2xl border shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Paid</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Section</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">Gross</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">TDS</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {report.invoices.filter((inv) => !search || inv.clientName.toLowerCase().includes(search.toLowerCase())).map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-sm">
                      <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline">
                        {inv.number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm">{inv.clientName}</td>
                    <td className="px-3 py-2 text-sm">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2 text-sm">{inv.paidDate ? formatDate(inv.paidDate) : "—"}</td>
                    <td className="px-3 py-2 text-sm">
                      {inv.tdsSection || "—"}
                      {inv.tdsRate ? <span className="text-muted-foreground text-xs ml-1">({inv.tdsRate}%)</span> : ""}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">{formatCurrency(inv.amount)}</td>
                    <td className="px-3 py-2 text-sm text-right text-orange-600">{inv.tdsAmount != null ? formatCurrency(inv.tdsAmount) : "—"}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-600">{inv.netReceived != null ? formatCurrency(inv.netReceived) : "—"}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-muted/30 font-medium">
                  <td colSpan={5} className="px-3 py-2 text-sm text-right">Total</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(report.grandTotals.totalInvoiced)}</td>
                  <td className="px-3 py-2 text-sm text-right text-orange-600">{formatCurrency(report.grandTotals.totalTDS)}</td>
                  <td className="px-3 py-2 text-sm text-right text-green-600">{formatCurrency(report.grandTotals.totalNetReceived)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.invoices.length === 0 && (
        <div className="rounded-2xl border shadow-sm p-12 text-center text-muted-foreground">
          No paid invoices with TDS data found for {report.fyLabel}.
        </div>
      )}
    </div>
  );
}
