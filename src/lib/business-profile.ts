import { prisma } from "@/lib/prisma";
import { BUSINESS } from "@/lib/constants";
import { readFileSync } from "fs";
import { resolve } from "path";

export interface BusinessData {
  name: string;
  address: string;
  phone: string;
  email: string;
  bank: string;
  ifsc: string;
  accountNo: string;
  accountName: string;
  accountType: string;
  pan: string;
}

function getSignatureFromFile(): string | null {
  const sigPath = process.env.SIGNATURE_IMAGE;
  if (!sigPath) return null;
  try {
    const abs = sigPath.startsWith("/") ? sigPath : resolve(process.cwd(), sigPath);
    const buf = readFileSync(abs);
    const ext = sigPath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function getBusinessProfile(): Promise<{
  business: BusinessData;
  signatureBase64: string | null;
}> {
  let row = await prisma.businessProfile.findUnique({ where: { id: "default" } });

  // Seed from .env on first access
  if (!row) {
    row = await prisma.businessProfile.create({
      data: {
        id: "default",
        name: BUSINESS.name,
        address: BUSINESS.address,
        phone: BUSINESS.phone,
        email: BUSINESS.email,
        bank: BUSINESS.bank,
        ifsc: BUSINESS.ifsc,
        accountNo: BUSINESS.accountNo,
        accountName: BUSINESS.accountName,
        accountType: BUSINESS.accountType,
        pan: BUSINESS.pan,
        signatureB64: getSignatureFromFile(),
      },
    });
  }

  return {
    business: {
      name: row.name || BUSINESS.name,
      address: row.address || BUSINESS.address,
      phone: row.phone || BUSINESS.phone,
      email: row.email || BUSINESS.email,
      bank: row.bank || BUSINESS.bank,
      ifsc: row.ifsc || BUSINESS.ifsc,
      accountNo: row.accountNo || BUSINESS.accountNo,
      accountName: row.accountName || BUSINESS.accountName,
      accountType: row.accountType || BUSINESS.accountType,
      pan: row.pan || BUSINESS.pan,
    },
    signatureBase64: row.signatureB64 ?? getSignatureFromFile(),
  };
}
