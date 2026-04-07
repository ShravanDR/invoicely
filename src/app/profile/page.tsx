"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import OrbitalLoader from "@/components/orbital-loader";

interface Profile {
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
  signatureB64: string | null;
}

const emptyProfile: Profile = {
  name: "", address: "", phone: "", email: "",
  bank: "", ifsc: "", accountNo: "", accountName: "", accountType: "Savings",
  pan: "", signatureB64: null,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setProfile({
          name: data.business.name,
          address: data.business.address,
          phone: data.business.phone,
          email: data.business.email,
          bank: data.business.bank,
          ifsc: data.business.ifsc,
          accountNo: data.business.accountNo,
          accountName: data.business.accountName,
          accountType: data.business.accountType,
          pan: data.business.pan,
          signatureB64: data.signatureBase64,
        });
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  function update(field: keyof Profile, value: string | null) {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update("signatureB64", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><OrbitalLoader size={64} /></div>;
  }

  return (
    <div className="p-8 mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold tracking-tight">My Profile</h1>
        {saved && (
          <span className="text-sm font-medium text-green-600 bg-green-50 rounded-lg px-3 py-1.5">
            Saved
          </span>
        )}
      </div>

      <div className="space-y-8">
        {/* Personal Details */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                value={profile.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={profile.address}
                onChange={(e) => update("address", e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="border-t" />

        {/* Bank Details */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input
                value={profile.bank}
                onChange={(e) => update("bank", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IFSC Code</label>
              <input
                value={profile.ifsc}
                onChange={(e) => update("ifsc", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input
                value={profile.accountNo}
                onChange={(e) => update("accountNo", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Name</label>
              <input
                value={profile.accountName}
                onChange={(e) => update("accountName", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Type</label>
              <select
                value={profile.accountType}
                onChange={(e) => update("accountType", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
              </select>
            </div>
          </div>
        </section>

        <div className="border-t" />

        {/* Tax Details */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Details</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-1">PAN</label>
            <input
              value={profile.pan}
              onChange={(e) => update("pan", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </section>

        <div className="border-t" />

        {/* Signature */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signature</h2>
          {profile.signatureB64 ? (
            <div className="flex items-start gap-4">
              <div className="rounded-lg border bg-white p-3">
                <img src={profile.signatureB64} alt="Signature" className="h-16 opacity-85" />
              </div>
              <button
                onClick={() => update("signatureB64", null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove signature"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No signature uploaded</p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              {profile.signatureB64 ? "Replace signature" : "Upload signature"}
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignatureUpload}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent file:transition-colors file:cursor-pointer"
            />
          </div>
        </section>

        <div className="border-t" />

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
