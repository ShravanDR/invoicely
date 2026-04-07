import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INVOICE_TEMPLATE } from "@/lib/constants";
import { renderInvoiceHtml } from "@/lib/invoice-templates";
import { getBusinessProfile } from "@/lib/business-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const templateOverride = new URL(req.url).searchParams.get("template");
  const templateName = templateOverride || INVOICE_TEMPLATE;
  const download = new URL(req.url).searchParams.get("download");

  const { business, signatureBase64 } = await getBusinessProfile();

  const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const items = invoice.lineItems.length > 0
    ? invoice.lineItems.map((li) => ({
        description: li.description,
        details: li.details,
        qty: li.qty,
        rate: li.rate,
        amount: li.amount,
      }))
    : [{ description: invoice.description, details: null, qty: 1, rate: invoice.amount, amount: invoice.amount }];

  const html = renderInvoiceHtml(templateName, {
    invoiceNumber: invoice.number || "DRAFT",
    invoiceDate: fmtDate(invoice.invoiceDate),
    dueDate: fmtDate(invoice.dueDate),
    status: invoice.status,
    forPdf: download === "1",
    business,
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
      address: invoice.client.address,
    },
    items,
    total: invoice.amount,
    notes: invoice.notes,
    payment: invoice.status === "paid" && invoice.paidDate ? {
      paidDate: fmtDate(invoice.paidDate),
      tdsSection: invoice.tdsSection,
      tdsRate: invoice.tdsRate,
      tdsAmount: invoice.tdsAmount || 0,
      netReceived: invoice.netReceived || 0,
    } : null,
    signatureBase64,
  });

  if (download === "1") {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      const label = invoice.number || "DRAFT";
      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Invoice-${label}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
