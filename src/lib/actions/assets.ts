"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { canTransition } from "@/lib/lifecycle";
import { isPointInsideGeofence } from "@/lib/geofence";
import { ASSET_PHOTOS_BUCKET } from "@/lib/storage";
import type { Asset, AssetStatus, GeofenceShape } from "@/lib/types/database";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface AssetFormInput {
  asset_tag: string;
  name: string;
  category_id: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  rfid_tag: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  supplier: string | null;
  assigned_to: string | null;
  department: string | null;
  cost_centre: string | null;
  home_location_id: string | null;
  current_location_id: string | null;
  warranty_provider: string | null;
  warranty_start: string | null;
  warranty_expiry: string | null;
  status: AssetStatus;
}

export async function createAsset(input: AssetFormInput) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .insert({ ...input, tenant_id: session.profile.tenant_id })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: data.id,
    action: "created",
    actorId: session.userId,
    after: data,
  });

  revalidatePath("/assets");
  return { data: data as Asset };
}

export async function updateAsset(assetId: string, input: Partial<AssetFormInput>) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: before } = await supabase.from("assets").select("*").eq("id", assetId).single();

  const { data, error } = await supabase
    .from("assets")
    .update(input)
    .eq("id", assetId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "updated",
    actorId: session.userId,
    before,
    after: data,
  });

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return { data: data as Asset };
}

export async function archiveAsset(assetId: string) {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("assets").update({ archived: true }).eq("id", assetId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "archived",
    actorId: session.userId,
  });

  revalidatePath("/assets");
  return { data: true };
}

export async function transitionAssetStatus(assetId: string, toStatus: AssetStatus, note?: string) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: asset } = await supabase.from("assets").select("status").eq("id", assetId).single();
  if (!asset) return { error: "Asset not found." };

  if (!canTransition(asset.status, toStatus)) {
    return { error: `Cannot move an asset from ${asset.status} to ${toStatus}.` };
  }

  const { error: updateError } = await supabase
    .from("assets")
    .update({ status: toStatus })
    .eq("id", assetId);
  if (updateError) return { error: updateError.message };

  await supabase.from("asset_lifecycle_events").insert({
    tenant_id: session.profile.tenant_id,
    asset_id: assetId,
    from_status: asset.status,
    to_status: toStatus,
    changed_by: session.userId,
    note: note ?? null,
  });

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "status_changed",
    actorId: session.userId,
    before: { status: asset.status },
    after: { status: toStatus },
  });

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { data: true };
}

export async function uploadAssetPhoto(assetId: string, formData: FormData) {
  const session = await requireSession();
  const supabase = await createClient();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Image must be smaller than 5MB." };

  const { data: asset } = await supabase.from("assets").select("image_path").eq("id", assetId).single();
  if (!asset) return { error: "Asset not found." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${session.profile.tenant_id}/${assetId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ASSET_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  if (asset.image_path) {
    await supabase.storage.from(ASSET_PHOTOS_BUCKET).remove([asset.image_path]);
  }

  const { error: updateError } = await supabase.from("assets").update({ image_path: path }).eq("id", assetId);
  if (updateError) return { error: updateError.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "photo_updated",
    actorId: session.userId,
  });

  revalidatePath(`/assets/${assetId}`);
  return { data: true };
}

export async function removeAssetPhoto(assetId: string) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: asset } = await supabase.from("assets").select("image_path").eq("id", assetId).single();
  if (!asset?.image_path) return { data: true };

  await supabase.storage.from(ASSET_PHOTOS_BUCKET).remove([asset.image_path]);

  const { error } = await supabase.from("assets").update({ image_path: null }).eq("id", assetId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "photo_removed",
    actorId: session.userId,
  });

  revalidatePath(`/assets/${assetId}`);
  return { data: true };
}

/**
 * Simulation Mode: stands in for a real GPS/BLE/RFID position report. Writes
 * to the same asset_location_history table a real tracker feed would use,
 * then evaluates geofences exactly as production breach detection would.
 */
export async function simulateAssetMove(assetId: string, lat: number, lng: number) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("id, tenant_id, asset_tag, name, current_location_id, home_location_id")
    .eq("id", assetId)
    .single();
  if (!asset) return { error: "Asset not found." };

  await supabase.from("asset_location_history").insert({
    tenant_id: session.profile.tenant_id,
    asset_id: assetId,
    location_id: asset.current_location_id,
    lat,
    lng,
    source: "simulation",
  });

  await supabase
    .from("assets")
    .update({ current_lat: lat, current_lng: lng, last_seen_at: new Date().toISOString() })
    .eq("id", assetId);

  const homeLocationId = asset.home_location_id ?? asset.current_location_id;
  let breached = false;
  let breachedGeofenceName: string | null = null;

  if (homeLocationId) {
    const { data: geofences } = await supabase
      .from("geofences")
      .select("id, name, shape, enabled, geofence_assets(asset_id)")
      .eq("location_id", homeLocationId)
      .eq("enabled", true);

    for (const gf of geofences ?? []) {
      const assignments = (gf.geofence_assets as { asset_id: string }[]) ?? [];
      const appliesToThisAsset = assignments.length === 0 || assignments.some((a) => a.asset_id === assetId);
      if (!appliesToThisAsset) continue;

      const inside = isPointInsideGeofence([lat, lng], gf.shape as GeofenceShape);
      if (!inside) {
        breached = true;
        breachedGeofenceName = gf.name;

        const { data: existingOpen } = await supabase
          .from("alerts")
          .select("id")
          .eq("asset_id", assetId)
          .eq("type", "geofence_breach")
          .eq("status", "open")
          .limit(1);

        if (!existingOpen || existingOpen.length === 0) {
          await supabase.from("alerts").insert({
            tenant_id: session.profile.tenant_id,
            type: "geofence_breach",
            severity: "critical",
            asset_id: assetId,
            location_id: homeLocationId,
            reason: `${asset.name} (${asset.asset_tag}) left the approved zone "${gf.name}".`,
            status: "open",
            details: { lat, lng, geofence_id: gf.id, geofence_name: gf.name },
          });
        }
        break;
      }
    }
  }

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "asset",
    entityId: assetId,
    action: "location_simulated",
    actorId: session.userId,
    after: { lat, lng, breached },
  });

  revalidatePath("/map");
  revalidatePath("/alerts");
  revalidatePath(`/assets/${assetId}`);

  return { data: { breached, geofenceName: breachedGeofenceName } };
}
