import { NextRequest, NextResponse } from "next/server";
import { INVOICE_TEMPLATE } from "@/lib/constants";
import { renderInvoiceHtml } from "@/lib/invoice-templates";
import { getBusinessProfile } from "@/lib/business-profile";

// POST: render a preview from arbitrary data (for unsaved drafts)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { business, signatureBase64 } = await getBusinessProfile();

  const html = renderInvoiceHtml(body.template || INVOICE_TEMPLATE, {
    invoiceNumber: body.invoiceNumber || "DRAFT",
    invoiceDate: body.invoiceDate || "—",
    dueDate: body.dueDate || "—",
    status: "draft",
    business,
    client: {
      name: body.clientName || "—",
      email: body.clientEmail,
      address: body.clientAddress,
    },
    items: body.items || [{ description: "—", details: null, qty: 1, rate: 0, amount: 0 }],
    total: body.total || 0,
    notes: body.notes,
    signatureBase64,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
