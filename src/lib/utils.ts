import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function toInputDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

// Convert number to Indian English words (for invoice totals)
export function amountInWords(n: number): string {
  if (n === 0) return "ZERO RUPEES ONLY";
  n = Math.round(n);

  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num: number): string {
    if (num >= 100) {
      return ones[Math.floor(num / 100)] + " HUNDRED" + (num % 100 ? " AND " + twoDigits(num % 100) : "");
    }
    return twoDigits(num);
  }

  // Indian numbering: crore (10^7), lakh (10^5), thousand (10^3), hundred (10^2)
  const parts: string[] = [];
  if (n >= 10000000) { parts.push(threeDigits(Math.floor(n / 10000000)) + " CRORE"); n %= 10000000; }
  if (n >= 100000) { parts.push(twoDigits(Math.floor(n / 100000)) + " LAKH"); n %= 100000; }
  if (n >= 1000) { parts.push(twoDigits(Math.floor(n / 1000)) + " THOUSAND"); n %= 1000; }
  if (n > 0) { parts.push(threeDigits(n)); }

  return parts.join(" ") + " RUPEES ONLY";
}
