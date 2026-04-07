import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fyStart = searchParams.get("fyStart");

  const startYear = fyStart
    ? parseInt(fyStart)
    : new Date().getMonth() < 3
      ? new Date().getFullYear() - 1
      : new Date().getFullYear();

  const fyStartDate = new Date(Date.UTC(startYear, 3, 1));
  const fyEndDate = new Date(Date.UTC(startYear + 1, 3, 0, 23, 59, 59));

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "paid",
      tdsAmount: { not: null },
      invoiceDate: { gte: fyStartDate, lte: fyEndDate },
    },
    include: { client: true },
    orderBy: { invoiceDate: "asc" },
  });

  // Per-client summary
  const clientMap = new Map<string, {
    clientName: string;
    invoiceCount: number;
    totalInvoiced: number;
    totalTDS: number;
    totalNetReceived: number;
    sections: Map<string, { tdsAmount: number; invoiceCount: number }>;
  }>();

  for (const inv of invoices) {
    let entry = clientMap.get(inv.clientId);
    if (!entry) {
      entry = {
        clientName: inv.client.name,
        invoiceCount: 0,
        totalInvoiced: 0,
        totalTDS: 0,
        totalNetReceived: 0,
        sections: new Map(),
      };
      clientMap.set(inv.clientId, entry);
    }
    entry.invoiceCount++;
    entry.totalInvoiced += inv.amount;
    entry.totalTDS += inv.tdsAmount || 0;
    entry.totalNetReceived += inv.netReceived || 0;

    const section = inv.tdsSection || "Unknown";
    const sectionEntry = entry.sections.get(section) || { tdsAmount: 0, invoiceCount: 0 };
    sectionEntry.tdsAmount += inv.tdsAmount || 0;
    sectionEntry.invoiceCount++;
    entry.sections.set(section, sectionEntry);
  }

  const clientSummary = Array.from(clientMap.entries()).map(([clientId, entry]) => ({
    clientId,
    clientName: entry.clientName,
    invoiceCount: entry.invoiceCount,
    totalInvoiced: entry.totalInvoiced,
    totalTDS: entry.totalTDS,
    totalNetReceived: entry.totalNetReceived,
    sections: Array.from(entry.sections.entries()).map(([code, data]) => ({
      code,
      tdsAmount: data.tdsAmount,
      invoiceCount: data.invoiceCount,
    })),
  }));

  // Per-section summary (across all clients)
  const sectionMap = new Map<string, { tdsAmount: number; invoiceCount: number; totalInvoiced: number }>();
  for (const inv of invoices) {
    const section = inv.tdsSection || "Unknown";
    const entry = sectionMap.get(section) || { tdsAmount: 0, invoiceCount: 0, totalInvoiced: 0 };
    entry.tdsAmount += inv.tdsAmount || 0;
    entry.invoiceCount++;
    entry.totalInvoiced += inv.amount;
    sectionMap.set(section, entry);
  }
  const sectionSummary = Array.from(sectionMap.entries()).map(([code, data]) => ({
    code,
    ...data,
  }));

  // Grand totals
  const grandTotalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const grandTotalTDS = invoices.reduce((s, i) => s + (i.tdsAmount || 0), 0);
  const grandTotalNetReceived = invoices.reduce((s, i) => s + (i.netReceived || 0), 0);

  // Individual invoice rows for detail view
  const invoiceRows = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    clientName: inv.client.name,
    description: inv.description,
    invoiceDate: inv.invoiceDate,
    paidDate: inv.paidDate,
    amount: inv.amount,
    tdsSection: inv.tdsSection,
    tdsRate: inv.tdsRate,
    tdsAmount: inv.tdsAmount,
    netReceived: inv.netReceived,
  }));

  return NextResponse.json({
    fyLabel: `FY ${startYear}-${(startYear + 1).toString().slice(2)}`,
    grandTotals: {
      totalInvoiced: grandTotalInvoiced,
      totalTDS: grandTotalTDS,
      totalNetReceived: grandTotalNetReceived,
      invoiceCount: invoices.length,
    },
    clientSummary,
    sectionSummary,
    invoices: invoiceRows,
  });
}
