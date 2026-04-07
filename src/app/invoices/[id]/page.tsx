"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InvoiceEditor } from "@/components/invoice-editor";
import OrbitalLoader from "@/components/orbital-loader";

interface Invoice {
  id: string;
  number: string | null;
  description: string;
  amount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  tdsSection: string | null;
  tdsRate: number | null;
  tdsAmount: number | null;
  netReceived: number | null;
  notes: string | null;
  lineItems: { id: string; description: string; details?: string; qty: number; rate: number; amount: number; sortOrder: number }[];
  client: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .catch(console.error);
  }, [params.id]);

  if (!invoice) {
    return (
      <div className="flex h-screen items-center justify-center">
        <OrbitalLoader size={80} />
      </div>
    );
  }

  return <InvoiceEditor invoice={invoice} mode="view" />;
}
