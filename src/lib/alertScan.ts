import type { SupabaseClient } from "@supabase/supabase-js";
import { isPointInsideGeofence } from "@/lib/geofence";
import type { GeofenceShape } from "@/lib/types/database";

/**
 * Idempotently raises warranty/unassigned/missing/geofence-breach alerts
 * from current data for one tenant. Shared by the admin-triggered "Run
 * Alert Scan" button and the /api/cron/alert-scan route, so the same
 * detection logic runs whether it's clicked manually or fired on a
 * schedule (or, eventually, by a real GPS/IoT position feed writing into
 * assets.current_lat/current_lng).
 */
export async function scanTenantAlerts(supabase: SupabaseClient, tenantId: string): Promise<number> {
  let created = 0;

  const today = new Date();
  const horizon = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: expiringSoon } = await supabase
    .from("assets")
    .select("id, asset_tag, name, warranty_expiry, current_location_id")
    .eq("tenant_id", tenantId)
    .eq("archived", false)
    .not("warranty_expiry", "is", null)
    .lte("warranty_expiry", horizon)
    .gte("warranty_expiry", today.toISOString().slice(0, 10));

  for (const asset of expiringSoon ?? []) {
    if (await hasOpenAlert(supabase, asset.id, "warranty_expiry")) continue;
    await supabase.from("alerts").insert({
      tenant_id: tenantId,
      type: "warranty_expiry",
      severity: "medium",
      asset_id: asset.id,
      location_id: asset.current_location_id,
      reason: `${asset.name} (${asset.asset_tag}) warranty expires on ${asset.warranty_expiry}.`,
      status: "open",
    });
    created++;
  }

  const { data: unassigned } = await supabase
    .from("assets")
    .select("id, asset_tag, name, current_location_id")
    .eq("tenant_id", tenantId)
    .eq("archived", false)
    .is("assigned_to", null)
    .in("status", ["assigned", "in_use"]);

  for (const asset of unassigned ?? []) {
    if (await hasOpenAlert(supabase, asset.id, "unassigned_asset")) continue;
    await supabase.from("alerts").insert({
      tenant_id: tenantId,
      type: "unassigned_asset",
      severity: "low",
      asset_id: asset.id,
      location_id: asset.current_location_id,
      reason: `${asset.name} (${asset.asset_tag}) is in active use but has no assigned custodian.`,
      status: "open",
    });
    created++;
  }

  const { data: missing } = await supabase
    .from("assets")
    .select("id, asset_tag, name, current_location_id")
    .eq("tenant_id", tenantId)
    .eq("status", "missing");

  for (const asset of missing ?? []) {
    if (await hasOpenAlert(supabase, asset.id, "missing_asset")) continue;
    await supabase.from("alerts").insert({
      tenant_id: tenantId,
      type: "missing_asset",
      severity: "critical",
      asset_id: asset.id,
      location_id: asset.current_location_id,
      reason: `${asset.name} (${asset.asset_tag}) is marked missing and requires investigation.`,
      status: "open",
    });
    created++;
  }

  created += await scanGeofenceBreaches(supabase, tenantId);

  return created;
}

async function hasOpenAlert(supabase: SupabaseClient, assetId: string, type: string): Promise<boolean> {
  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("asset_id", assetId)
    .eq("type", type)
    .eq("status", "open")
    .limit(1);
  return !!data && data.length > 0;
}

async function scanGeofenceBreaches(supabase: SupabaseClient, tenantId: string): Promise<number> {
  let created = 0;

  const { data: geofences } = await supabase
    .from("geofences")
    .select("id, name, location_id, shape, geofence_assets(asset_id)")
    .eq("tenant_id", tenantId)
    .eq("enabled", true);

  for (const gf of geofences ?? []) {
    const assignedAssetIds = ((gf.geofence_assets as { asset_id: string }[]) ?? []).map((a) => a.asset_id);

    let query = supabase
      .from("assets")
      .select("id, asset_tag, name, current_lat, current_lng, home_location_id, current_location_id")
      .eq("tenant_id", tenantId)
      .eq("archived", false)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null);

    query = assignedAssetIds.length > 0 ? query.in("id", assignedAssetIds) : query.eq("home_location_id", gf.location_id);

    const { data: candidateAssets } = await query;

    for (const asset of candidateAssets ?? []) {
      const inside = isPointInsideGeofence([asset.current_lat!, asset.current_lng!], gf.shape as GeofenceShape);
      if (inside) continue;
      if (await hasOpenAlert(supabase, asset.id, "geofence_breach")) continue;

      await supabase.from("alerts").insert({
        tenant_id: tenantId,
        type: "geofence_breach",
        severity: "critical",
        asset_id: asset.id,
        location_id: asset.current_location_id ?? gf.location_id,
        reason: `${asset.name} (${asset.asset_tag}) is outside its approved zone "${gf.name}".`,
        status: "open",
        details: { lat: asset.current_lat, lng: asset.current_lng, geofence_id: gf.id, geofence_name: gf.name },
      });
      created++;
    }
  }

  return created;
}
