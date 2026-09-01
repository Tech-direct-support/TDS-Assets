import type { SupabaseClient } from "@supabase/supabase-js";
import { ASSET_STATUS_LABELS } from "@/lib/lifecycle";
import type { AssetStatus } from "@/lib/types/database";

/** Aggregate counts that drive the dashboard header tiles. */
export async function getFleetSummary(supabase: SupabaseClient, tenantId: string) {
  const { data: assets } = await supabase
    .from("assets")
    .select("status, assigned_to, archived")
    .eq("tenant_id", tenantId)
    .eq("archived", false);

  const rows = assets ?? [];
  const total = rows.length;
  const byStatus = (s: AssetStatus) => rows.filter((r) => r.status === s).length;
  const active = rows.filter((r) => !["written_off", "disposal"].includes(r.status)).length;

  const { count: openAlerts } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "open");

  return {
    total,
    active,
    inStock: byStatus("in_stock"),
    assigned: byStatus("assigned"),
    inUse: byStatus("in_use"),
    maintenance: byStatus("maintenance"),
    missing: byStatus("missing"),
    unassigned: rows.filter((r) => !r.assigned_to).length,
    openAlerts: openAlerts ?? 0,
  };
}

export async function getAssetsByCategory(supabase: SupabaseClient, tenantId: string) {
  const { data } = await supabase
    .from("assets")
    .select("category_id, asset_categories(name)")
    .eq("tenant_id", tenantId)
    .eq("archived", false);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const rel = row.asset_categories as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    const key = name ?? "Uncategorised";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function getAssetsByLocation(supabase: SupabaseClient, tenantId: string) {
  const { data } = await supabase
    .from("assets")
    .select("current_location_id, locations(name)")
    .eq("tenant_id", tenantId)
    .eq("archived", false);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const rel = row.locations as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    const key = name ?? "Unassigned location";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function getAssetsByStatus(supabase: SupabaseClient, tenantId: string) {
  const { data } = await supabase
    .from("assets")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("archived", false);

  const counts = new Map<AssetStatus, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts, ([status, count]) => ({
    status,
    label: ASSET_STATUS_LABELS[status],
    count,
  })).sort((a, b) => b.count - a.count);
}

export async function getWarrantyExpiring(
  supabase: SupabaseClient,
  tenantId: string,
  withinDays = 60
) {
  const today = new Date();
  const horizon = new Date(today.getTime() + withinDays * 86400000);

  const { data } = await supabase
    .from("assets")
    .select("id, asset_tag, name, warranty_expiry, warranty_provider")
    .eq("tenant_id", tenantId)
    .eq("archived", false)
    .not("warranty_expiry", "is", null)
    .lte("warranty_expiry", horizon.toISOString().slice(0, 10))
    .order("warranty_expiry", { ascending: true });

  return (data ?? []).filter((a) => a.warranty_expiry && a.warranty_expiry >= today.toISOString().slice(0, 10));
}

export async function getRecentAlerts(supabase: SupabaseClient, tenantId: string, limit = 8) {
  const { data } = await supabase
    .from("alerts")
    .select("*, assets(asset_tag, name), locations(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentActivity(supabase: SupabaseClient, tenantId: string, limit = 10) {
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
