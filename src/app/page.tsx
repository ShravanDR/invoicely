"use client";

import { useEffect, useState } from "react";
import {
  TotalsCards,
  MonthlyRevenueChart,
  RevenueDonutChart,
} from "@/components/dashboard-charts";
import OrbitalLoader from "@/components/orbital-loader";
import { Select } from "@/components/select";
import {
  getCurrentFYStartYear,
  getFYLabel,
  getFYOptions,
} from "@/lib/constants";

interface DashboardData {
  totals: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalTDS: number;
    totalNetReceived: number;
  };
  monthly: { month: string; received: number; tds: number; unpaid: number }[];
  statusBreakdown: { draft: number; sent: number; paid: number };
  invoiceCount: number;
  fyLabel: string;
  view: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [fyStart, setFyStart] = useState(getCurrentFYStartYear());
  const [clientId, setClientId] = useState("");
  const [view, setView] = useState("paid");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ fyStart: fyStart.toString(), view });
    if (clientId) params.set("clientId", clientId);

    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [fyStart, clientId, view]);

  const fyOptions = getFYOptions(2024);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data?.fyLabel || getFYLabel(fyStart)}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={fyStart}
            onChange={(e) => setFyStart(parseInt(e.target.value))}
          >
            {fyOptions.map((label) => {
              const year = parseInt(label.split(" ")[1].split("-")[0]);
              return (
                <option key={year} value={year}>
                  {label}
                </option>
              );
            })}
          </Select>
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="paid">Paid Invoices</option>
            <option value="all">All Invoices</option>
          </Select>
        </div>
      </div>

      {data && (
        <>
          <TotalsCards
            totalInvoiced={data.totals.totalInvoiced}
            totalPaid={data.totals.totalPaid}
            totalOutstanding={data.totals.totalOutstanding}
            totalTDS={data.totals.totalTDS}
            totalNetReceived={data.totals.totalNetReceived}
            invoiceCount={data.invoiceCount}
          />

          <div className="grid grid-cols-2 gap-6">
            <MonthlyRevenueChart data={data.monthly} showUnpaid={view === "all"} />
            <RevenueDonutChart
              data={{
                totalNetReceived: data.totals.totalNetReceived,
                totalTDS: data.totals.totalTDS,
                totalInvoiced: data.totals.totalInvoiced,
                totalOutstanding: data.totals.totalOutstanding,
                showUnpaid: view === "all",
              }}
            />
          </div>
        </>
      )}

      {!data && (
        <div className="flex h-64 items-center justify-center">
          <OrbitalLoader size={64} />
        </div>
      )}
    </div>
  );
}
