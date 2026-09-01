"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAsset, updateAsset, type AssetFormInput } from "@/lib/actions/assets";
import { Button } from "@/components/ui/Button";
import { ASSET_STATUS_LABELS } from "@/lib/lifecycle";
import type { Asset, AssetStatus } from "@/lib/types/database";

interface Option {
  id: string;
  name: string;
}

const STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS) as [AssetStatus, string][];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black bg-white";

export function AssetForm({
  mode,
  asset,
  categories,
  locations,
  users,
}: {
  mode: "create" | "edit";
  asset?: Asset;
  categories: Option[];
  locations: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const input: AssetFormInput = {
      asset_tag: String(fd.get("asset_tag") ?? "").trim(),
      name: String(fd.get("name") ?? "").trim(),
      category_id: (fd.get("category_id") as string) || null,
      manufacturer: (fd.get("manufacturer") as string) || null,
      model: (fd.get("model") as string) || null,
      serial_number: (fd.get("serial_number") as string) || null,
      rfid_tag: (fd.get("rfid_tag") as string) || null,
      purchase_date: (fd.get("purchase_date") as string) || null,
      purchase_price: fd.get("purchase_price") ? Number(fd.get("purchase_price")) : null,
      supplier: (fd.get("supplier") as string) || null,
      assigned_to: (fd.get("assigned_to") as string) || null,
      department: (fd.get("department") as string) || null,
      cost_centre: (fd.get("cost_centre") as string) || null,
      home_location_id: (fd.get("home_location_id") as string) || null,
      current_location_id: (fd.get("current_location_id") as string) || null,
      warranty_provider: (fd.get("warranty_provider") as string) || null,
      warranty_start: (fd.get("warranty_start") as string) || null,
      warranty_expiry: (fd.get("warranty_expiry") as string) || null,
      status: (fd.get("status") as AssetStatus) || "ordered",
    };

    const res = mode === "create" ? await createAsset(input) : await updateAsset(asset!.id, input);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(`/assets/${res.data && "id" in res.data ? res.data.id : asset!.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      {error && (
        <div className="mb-4 text-[12px] px-3 py-2 border border-red bg-red-tint text-red-dark rounded-[3px]">
          {error}
        </div>
      )}

      <section className="mb-6">
        <h3 className="text-[13px] font-semibold text-ink mb-3 pb-2 border-b border-line">Asset Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Asset ID (Tag)">
            <input name="asset_tag" defaultValue={asset?.asset_tag} required className={inputClass} placeholder="LAP-1024" />
          </Field>
          <Field label="Name">
            <input name="name" defaultValue={asset?.name} required className={inputClass} placeholder="Dell Latitude 5440" />
          </Field>
          <Field label="Category">
            <select name="category_id" defaultValue={asset?.category_id ?? ""} className={inputClass}>
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Manufacturer">
            <input name="manufacturer" defaultValue={asset?.manufacturer ?? ""} className={inputClass} />
          </Field>
          <Field label="Model">
            <input name="model" defaultValue={asset?.model ?? ""} className={inputClass} />
          </Field>
          <Field label="Serial Number">
            <input name="serial_number" defaultValue={asset?.serial_number ?? ""} className={inputClass} />
          </Field>
          <Field label="Tag ID (RFID)">
            <input name="rfid_tag" defaultValue={asset?.rfid_tag ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={asset?.status ?? "ordered"} className={inputClass}>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-[13px] font-semibold text-ink mb-3 pb-2 border-b border-line">Financial</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Purchase Date">
            <input type="date" name="purchase_date" defaultValue={asset?.purchase_date ?? ""} className={inputClass} />
          </Field>
          <Field label="Purchase Price (AUD)">
            <input type="number" step="0.01" name="purchase_price" defaultValue={asset?.purchase_price ?? ""} className={inputClass} />
          </Field>
          <Field label="Supplier">
            <input name="supplier" defaultValue={asset?.supplier ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-[13px] font-semibold text-ink mb-3 pb-2 border-b border-line">Ownership</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Assigned Person">
            <select name="assigned_to" defaultValue={asset?.assigned_to ?? ""} className={inputClass}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <input name="department" defaultValue={asset?.department ?? ""} className={inputClass} />
          </Field>
          <Field label="Cost Centre">
            <input name="cost_centre" defaultValue={asset?.cost_centre ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-[13px] font-semibold text-ink mb-3 pb-2 border-b border-line">Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Home / Approved Location">
            <select name="home_location_id" defaultValue={asset?.home_location_id ?? ""} className={inputClass}>
              <option value="">Not set</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Current Location">
            <select name="current_location_id" defaultValue={asset?.current_location_id ?? ""} className={inputClass}>
              <option value="">Not set</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-[13px] font-semibold text-ink mb-3 pb-2 border-b border-line">Warranty</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Warranty Provider">
            <input name="warranty_provider" defaultValue={asset?.warranty_provider ?? ""} className={inputClass} />
          </Field>
          <Field label="Warranty Start">
            <input type="date" name="warranty_start" defaultValue={asset?.warranty_start ?? ""} className={inputClass} />
          </Field>
          <Field label="Warranty Expiry">
            <input type="date" name="warranty_expiry" defaultValue={asset?.warranty_expiry ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving..." : mode === "create" ? "Create Asset" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
