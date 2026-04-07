import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFYPrefix } from "@/lib/constants";

const INCLUDE = { client: true, lineItems: { orderBy: { sortOrder: "asc" as const } } };

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: INCLUDE,
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  // Allow editing all fields while still a draft
  if (existing.status === "draft") {
    if (body.description !== undefined) data.description = body.description;
    if (body.invoiceDate) data.invoiceDate = new Date(body.invoiceDate);
    if (body.dueDate) data.dueDate = new Date(body.dueDate);
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.clientId) data.clientId = body.clientId;

    // Handle line items update
    if (body.lineItems !== undefined) {
      const lineItems = body.lineItems as { description: string; details?: string | null; qty: number; rate: number }[];
      // Delete existing and recreate
      await prisma.lineItem.deleteMany({ where: { invoiceId: params.id } });
      if (lineItems.length > 0) {
        await prisma.lineItem.createMany({
          data: lineItems.map((li, i) => ({
            invoiceId: params.id,
            description: li.description,
            details: li.details || null,
            qty: li.qty || 1,
            rate: li.rate || 0,
            amount: (li.qty || 1) * (li.rate || 0),
            sortOrder: i,
          })),
        });
        // Recompute total from line items
        data.amount = lineItems.reduce((sum, li) => sum + (li.qty || 1) * (li.rate || 0), 0);
      }
    } else if (body.amount !== undefined) {
      data.amount = parseFloat(body.amount);
    }
  }

  // Status transitions: draft→sent, sent→paid, sent→cancelled
  const validTransitions: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
  };

  if (body.status && body.status !== existing.status) {
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${body.status}` },
        { status: 400 }
      );
    }
    data.status = body.status;

    if (body.status === "sent" && existing.number === null) {
      const fyPrefix = getFYPrefix(existing.invoiceDate);
      const counter = await prisma.invoiceCounter.upsert({
        where: { id: fyPrefix },
        update: { current: { increment: 1 } },
        create: { id: fyPrefix, current: 1 },
      });
      data.number = `${fyPrefix}-${String(counter.current).padStart(3, "0")}`;
    }

    if (body.status === "paid") {
      data.paidDate = body.paidDate ? new Date(body.paidDate) : new Date();
      if (body.tdsSection !== undefined) data.tdsSection = body.tdsSection || null;
      if (body.tdsRate !== undefined) data.tdsRate = body.tdsRate ? parseFloat(body.tdsRate) : null;
      if (body.tdsAmount !== undefined) data.tdsAmount = parseFloat(body.tdsAmount);
      if (body.netReceived !== undefined) data.netReceived = parseFloat(body.netReceived);
    }
  }

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data,
    include: INCLUDE,
  });
  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
