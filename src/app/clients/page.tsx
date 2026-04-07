"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  isDefault: boolean;
  _count: { invoices: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold tracking-tight">Clients</h1>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-56"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Invoices
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Default
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.filter((client) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                client.name.toLowerCase().includes(q) ||
                (client.email && client.email.toLowerCase().includes(q))
              );
            }).map((client) => (
              <tr key={client.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link
                    href={`/clients/${client.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {client.email || "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {client._count.invoices}
                </td>
                <td className="px-4 py-3 text-sm">
                  {client.isDefault && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Default
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No clients yet. Add your first client to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
