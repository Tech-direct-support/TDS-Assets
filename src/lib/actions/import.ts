"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AssetStatus } from "@/lib/types/database";

export interface CsvAssetRow {
  asset_name?: string;
  asset_type?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string;
  purchase_price?: string;
  assigned_to?: string;
  location?: string;
  status?: string;
  warranty_expiry?: string;
  tag_id?: string;
}

const VALID_STATUSES: AssetStatus[] = [
  "ordered", "received", "in_stock", "assigned", "in_use",
  "maintenance", "in_transit", "missing", "returned", "disposal", "written_off",
];

export interface ImportResult {
  imported: number;
  failed: { row: number; reason: string }[];
  duplicates: { row: number; serial_number: string }[];
}

export async function importAssetsCsv(rows: CsvAssetRow[]): Promise<ImportResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [{ data: categories }, { data: locations }, { data: existingAssets }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").eq("tenant_id", tenantId),
    supabase.from("locations").select("id, name").eq("tenant_id", tenantId),
    supabase.from("assets").select("serial_number, asset_tag").eq("tenant_id", tenantId),
  ]);

  const categoryByName = new Map((categories ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const locationByName = new Map((locations ?? []).map((l) => [l.name.toLowerCase(), l.id]));
  const existingSerials = new Set((existingAssets ?? []).map((a) => a.serial_number).filter(Boolean));
  const existingTags = new Set((existingAssets ?? []).map((a) => a.asset_tag));

  const result: ImportResult = { imported: 0, failed: [], duplicates: [] };
  let nextTagSeq = existingTags.size + 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header is row 1

    if (!row.asset_name?.trim()) {
      result.failed.push({ row: rowNum, reason: "asset_name is required." });
      continue;
    }

    if (row.serial_number && existingSerials.has(row.serial_number)) {
      result.duplicates.push({ row: rowNum, serial_number: row.serial_number });
      continue;
    }

    const status = (row.status?.trim().toLowerCase().replace(/\s+/g, "_") ?? "in_stock") as AssetStatus;
    if (!VALID_STATUSES.includes(status)) {
      result.failed.push({ row: rowNum, reason: `Unrecognised status "${row.status}".` });
      continue;
    }

    const purchasePrice = row.purchase_price ? Number(row.purchase_price) : null;
    if (row.purchase_price && Number.isNaN(purchasePrice)) {
      result.failed.push({ row: rowNum, reason: `Invalid purchase_price "${row.purchase_price}".` });
      continue;
    }

    let assetTag = row.tag_id?.trim();
    if (!assetTag || existingTags.has(assetTag)) {
      const prefix = (row.asset_type?.slice(0, 3) || "AST").toUpperCase();
      do {
        assetTag = `${prefix}-${1000 + nextTagSeq}`;
        nextTagSeq++;
      } while (existingTags.has(assetTag));
    }
    existingTags.add(assetTag);
    if (row.serial_number) existingSerials.add(row.serial_number);

    const { data: inserted, error } = await supabase
      .from("assets")
      .insert({
        tenant_id: tenantId,
        asset_tag: assetTag,
        name: row.asset_name.trim(),
        category_id: row.asset_type ? categoryByName.get(row.asset_type.trim().toLowerCase()) ?? null : null,
        manufacturer: row.manufacturer?.trim() || null,
        model: row.model?.trim() || null,
        serial_number: row.serial_number?.trim() || null,
        purchase_date: row.purchase_date?.trim() || null,
        purchase_price: purchasePrice,
        current_location_id: row.location ? locationByName.get(row.location.trim().toLowerCase()) ?? null : null,
        home_location_id: row.location ? locationByName.get(row.location.trim().toLowerCase()) ?? null : null,
        warranty_expiry: row.warranty_expiry?.trim() || null,
        status,
      })
      .select("id")
      .single();

    if (error) {
      result.failed.push({ row: rowNum, reason: error.message });
      continue;
    }

    await supabase.from("asset_lifecycle_events").insert({
      tenant_id: tenantId,
      asset_id: inserted.id,
      from_status: null,
      to_status: status,
      changed_by: session.userId,
      note: "Imported via CSV.",
    });

    result.imported++;
  }

  await logAudit(supabase, {
    tenantId,
    entityType: "asset_import",
    entityId: tenantId,
    action: "csv_import",
    actorId: session.userId,
    after: { imported: result.imported, failed: result.failed.length, duplicates: result.duplicates.length },
  });

  revalidatePath("/assets");
  return result;
}
