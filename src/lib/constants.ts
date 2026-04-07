// Business details — reads from .env so each user can configure their own instance
export const BUSINESS = {
  name: process.env.BUSINESS_NAME || "Your Name",
  address: (process.env.BUSINESS_ADDRESS || "Your Address").replace(/\\n/g, "\n"),
  phone: process.env.BUSINESS_PHONE || "",
  email: process.env.BUSINESS_EMAIL || "",
  bank: process.env.BUSINESS_BANK || "",
  ifsc: process.env.BUSINESS_IFSC || "",
  accountNo: process.env.BUSINESS_ACCOUNT_NO || "",
  accountName: process.env.BUSINESS_ACCOUNT_NAME || process.env.BUSINESS_NAME || "",
  accountType: process.env.BUSINESS_ACCOUNT_TYPE || "Savings",
  pan: process.env.BUSINESS_PAN || "",
};

export const INVOICE_TEMPLATE = process.env.INVOICE_TEMPLATE || "artistic";

// Financial year helpers (Indian FY: April to March)
export function getFYRange(fyStartYear: number) {
  return {
    start: new Date(fyStartYear, 3, 1),    // April 1
    end: new Date(fyStartYear + 1, 2, 31), // March 31
  };
}

export function getCurrentFYStartYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  // If Jan-Mar, FY started previous calendar year
  return month < 3 ? year - 1 : year;
}

export function getFYLabel(startYear: number): string {
  return `FY ${startYear}-${(startYear + 1).toString().slice(2)}`;
}

// Get all FY options from a starting year to current
export function getFYOptions(fromYear: number = 2024): string[] {
  const currentFY = getCurrentFYStartYear();
  const options: string[] = [];
  for (let y = currentFY; y >= fromYear; y--) {
    options.push(getFYLabel(y));
  }
  return options;
}

// Common TDS sections for freelancer/consultancy payments
export const TDS_SECTIONS = [
  { code: "194J", description: "Professional/Technical Services", rate: 10 },
  { code: "194C", description: "Contractor (Individual)", rate: 1 },
  { code: "194C-HUF", description: "Contractor (HUF/Firm)", rate: 2 },
  { code: "194I", description: "Rent", rate: 10 },
  { code: "194H", description: "Commission/Brokerage", rate: 5 },
  { code: "194O", description: "E-commerce Operator", rate: 1 },
] as const;

// Get FY prefix for invoice numbering, e.g. "FY27" for FY 2026-27
export function getFYPrefix(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  const fyEndYear = month < 3 ? year : year + 1; // Jan-Mar = same FY end year, Apr-Dec = next year
  return `FY${fyEndYear.toString().slice(2)}`;
}

export const INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const STATUS_COLOURS: Record<InvoiceStatus, string> = {
  draft: "bg-red-100 text-red-700",
  sent: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
};
