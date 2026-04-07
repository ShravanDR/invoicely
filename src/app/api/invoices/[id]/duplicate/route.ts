import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const source = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const asNextPart = body.asNextPart === true;

  let sequenceId = source.sequenceId;
  let nextPart = 1;

  if (asNextPart) {
    if (!sequenceId) {
      // Start a new sequence — assign to source and new invoice
      sequenceId = randomBytes(8).toString("hex");
      await prisma.invoice.update({
        where: { id: source.id },
        data: { sequenceId, invoicePart: 1 },
      });
    }
    // Find the highest part number in this sequence
    const maxPart = await prisma.invoice.aggregate({
      where: { sequenceId },
      _max: { invoicePart: true },
    });
    nextPart = (maxPart._max.invoicePart || 1) + 1;
  }

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 7);

  const duplicate = await prisma.invoice.create({
    data: {
      clientId: source.clientId,
      description: source.description,
      amount: source.amount,
      invoiceDate: today,
      dueDate,
      notes: source.notes,
      status: "draft",
      ...(asNextPart ? { invoicePart: nextPart, sequenceId } : {}),
      ...(source.lineItems.length > 0
        ? {
            lineItems: {
              create: source.lineItems.map((li) => ({
                description: li.description,
                details: li.details,
                qty: li.qty,
                rate: li.rate,
                amount: li.amount,
                sortOrder: li.sortOrder,
              })),
            },
          }
        : {}),
    },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(duplicate, { status: 201 });
}
