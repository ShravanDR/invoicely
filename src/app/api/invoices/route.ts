import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const fyStart = searchParams.get("fyStart");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (fyStart) {
    const startYear = parseInt(fyStart);
    where.invoiceDate = {
      gte: new Date(Date.UTC(startYear, 3, 1)),
      lte: new Date(Date.UTC(startYear + 1, 3, 0, 23, 59, 59)),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  invoices.sort((a, b) => {
    if (a.number === null && b.number === null) {
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    }
    if (a.number === null) return -1;
    if (b.number === null) return 1;
    return b.number.localeCompare(a.number);
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.clientId) {
    return NextResponse.json({ error: "Client is required" }, { status: 400 });
  }
  const client = await prisma.client.findUnique({ where: { id: body.clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const lineItems = body.lineItems as { description: string; details?: string | null; qty: number; rate: number }[] | undefined;

  // If line items provided, compute total from them; otherwise use body.amount
  let amount = parseFloat(body.amount) || 0;
  if (lineItems && lineItems.length > 0) {
    amount = lineItems.reduce((sum, li) => sum + (li.qty || 1) * (li.rate || 0), 0);
  }

  const invoice = await prisma.invoice.create({
    data: {
      client: { connect: { id: body.clientId } },
      description: body.description || (lineItems?.[0]?.description ?? ""),
      amount,
      invoiceDate: new Date(body.invoiceDate),
      dueDate: new Date(body.dueDate),
      notes: body.notes || null,
      status: "draft",
      ...(lineItems && lineItems.length > 0
        ? {
            lineItems: {
              create: lineItems.map((li, i) => ({
                description: li.description,
                details: li.details || null,
                qty: li.qty || 1,
                rate: li.rate || 0,
                amount: (li.qty || 1) * (li.rate || 0),
                sortOrder: i,
              })),
            },
          }
        : {}),
    },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
