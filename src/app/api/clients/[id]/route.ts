import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      name: body.name,
      email: body.email || null,
      address: body.address || null,
      phone: body.phone || null,
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceCount = await prisma.invoice.count({ where: { clientId: params.id } });
  if (invoiceCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete client with ${invoiceCount} invoice${invoiceCount > 1 ? "s" : ""}. Delete their invoices first.` },
      { status: 409 }
    );
  }
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
