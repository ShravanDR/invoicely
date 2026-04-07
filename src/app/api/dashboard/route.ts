import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fyStart = searchParams.get("fyStart");
  const clientId = searchParams.get("clientId");
  const view = searchParams.get("view") || "paid"; // "paid" or "all"

  const startYear = fyStart
    ? parseInt(fyStart)
    : new Date().getMonth() < 3
      ? new Date().getFullYear() - 1
      : new Date().getFullYear();

  const fyStartDate = new Date(Date.UTC(startYear, 3, 1));      // April 1 00:00 UTC
  const fyEndDate = new Date(Date.UTC(startYear + 1, 3, 0, 23, 59, 59)); // March 31 23:59 UTC

  const where: Record<string, unknown> = {
    invoiceDate: { gte: fyStartDate, lte: fyEndDate },
    status: { not: "cancelled" },
  };
  if (clientId) where.clientId = clientId;

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: true },
    orderBy: { invoiceDate: "asc" },
  });

  // Totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalOutstanding = invoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.amount, 0);

  // TDS totals for FY reconciliation
  const totalTDS = invoices
    .filter((inv) => inv.status === "paid" && inv.tdsAmount)
    .reduce((sum, inv) => sum + (inv.tdsAmount || 0), 0);
  const totalNetReceived = invoices
    .filter((inv) => inv.status === "paid" && inv.netReceived)
    .reduce((sum, inv) => sum + (inv.netReceived || 0), 0);

  // Monthly breakdown for stacked bar chart
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (3 + i) % 12; // Start from April
    const year = monthIndex < 3 ? startYear + 1 : startYear;
    return {
      month: new Date(year, monthIndex, 1).toLocaleString("en-IN", {
        month: "short",
      }),
      year,
      monthIndex,
      received: 0,
      tds: 0,
      unpaid: 0,
    };
  });

  for (const inv of invoices) {
    const d = new Date(inv.invoiceDate);
    const mi = d.getMonth();
    const idx = mi >= 3 ? mi - 3 : mi + 9; // Map to FY index (April=0)
    if (idx >= 0 && idx < 12) {
      if (inv.status === "paid") {
        months[idx].received += inv.netReceived || 0;
        months[idx].tds += inv.tdsAmount || 0;
      } else {
        months[idx].unpaid += inv.amount;
      }
    }
  }

  // Status breakdown
  const statusBreakdown = {
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  return NextResponse.json({
    totals: { totalInvoiced, totalPaid, totalOutstanding, totalTDS, totalNetReceived },
    monthly: months,
    statusBreakdown,
    invoiceCount: invoices.length,
    fyLabel: `FY ${startYear}-${(startYear + 1).toString().slice(2)}`,
    view,
  });
}
