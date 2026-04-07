"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  received: number;
  tds: number;
  unpaid: number;
}

export function MonthlyRevenueChart({
  data,
  showUnpaid,
}: {
  data: MonthlyData[];
  showUnpaid: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Monthly Revenue
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 15% 91%)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(30 5% 50%)" }} />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "hsl(30 5% 50%)" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "received"
                ? "Payment Received"
                : name === "tds"
                  ? "TDS Deducted"
                  : "Unpaid",
            ]}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid hsl(35 15% 89%)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: "12px",
            }}
          />
          <Bar
            dataKey="received"
            name="received"
            stackId="revenue"
            fill="#34d399"
            radius={showUnpaid ? undefined : [0, 0, 0, 0]}
          />
          <Bar
            dataKey="tds"
            name="tds"
            stackId="revenue"
            fill="#e8853d"
            radius={showUnpaid ? [0, 0, 0, 0] : [6, 6, 0, 0]}
          />
          {showUnpaid && (
            <Bar
              dataKey="unpaid"
              name="unpaid"
              stackId="revenue"
              fill="#d1d5db"
              radius={[6, 6, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DonutData {
  totalNetReceived: number;
  totalTDS: number;
  totalInvoiced: number;
  totalOutstanding: number;
  showUnpaid: boolean;
}

export function RevenueDonutChart({ data }: { data: DonutData }) {
  const segments = [
    { name: "Payment Received", value: data.totalNetReceived, color: "#34d399" },
    { name: "TDS Deducted", value: data.totalTDS, color: "#e8853d" },
    ...(data.showUnpaid && data.totalOutstanding > 0
      ? [{ name: "Unpaid", value: data.totalOutstanding, color: "#d1d5db" }]
      : []),
  ].filter((s) => s.value > 0);

  const hasData = segments.length > 0;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Revenue Breakdown
      </h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={hasData ? segments : [{ name: "No data", value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              nameKey="name"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {hasData ? (
                segments.map((s, i) => <Cell key={i} fill={s.color} />)
              ) : (
                <Cell fill="#e5e7eb" />
              )}
            </Pie>
            {hasData && (
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(35 15% 89%)",
                  fontSize: "12px",
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-xl font-serif font-semibold tracking-tight">
            {formatCurrency(data.totalInvoiced)}
          </p>
        </div>
      </div>
      {/* Legend */}
      {hasData && (
        <div className="flex justify-center gap-6 mt-2">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TotalsProps {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  totalTDS: number;
  totalNetReceived: number;
}

export function TotalsCards({
  totalInvoiced,
  totalOutstanding,
  totalTDS,
  totalNetReceived,
}: TotalsProps) {
  const cards = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced), colour: "text-foreground" },
    { label: "Net Received", value: formatCurrency(totalNetReceived), colour: "text-emerald-600" },
    { label: "TDS Deducted", value: formatCurrency(totalTDS), colour: "text-amber-600" },
    { label: "Outstanding", value: formatCurrency(totalOutstanding), colour: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
          <p className={`mt-2 text-2xl font-serif font-semibold tracking-tight ${card.colour}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
