import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/business-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getBusinessProfile();
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Only allow known fields
  const allowed = [
    "name", "address", "phone", "email",
    "bank", "ifsc", "accountNo", "accountName", "accountType",
    "pan", "signatureB64",
  ];
  const data: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const profile = await prisma.businessProfile.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json(profile);
}
