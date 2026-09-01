"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AlertStatus } from "@/lib/types/database";

export async function updateAlertStatus(alertId: string, status: AlertStatus) {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("alerts")
    .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
    .eq("id", alertId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "alert",
    entityId: alertId,
    action: "status_changed",
    actorId: session.userId,
    after: { status },
  });

  revalidatePath("/alerts");
  revalidatePath(`/alerts/${alertId}`);
  return { data: true };
}

export async function assignAlertOperator(alertId: string, operatorId: string | null) {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("alerts").update({ assigned_operator: operatorId }).eq("id", alertId);
  if (error) return { error: error.message };

  revalidatePath(`/alerts/${alertId}`);
  return { data: true };
}

/**
 * System alert scan — stands in for a scheduled job (Supabase Edge Function
 * cron in production). Idempotently raises warranty/maintenance/unassigned
 * alerts from current data. Runs with the service role so it can be
 * triggered by an admin without needing elevated table access itself.
 */
export async function runAlertScan() {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "asset_manager") {
    return { error: "Only asset managers and admins can run the alert scan." };
  }

  const supabase = createAdminClient();
  const tenantId = session.profile.tenant_id;
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
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("asset_id", asset.id)
      .eq("type", "warranty_expiry")
      .eq("status", "open")
      .limit(1);
    if (existing && existing.length > 0) continue;

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
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("asset_id", asset.id)
      .eq("type", "unassigned_asset")
      .eq("status", "open")
      .limit(1);
    if (existing && existing.length > 0) continue;

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
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("asset_id", asset.id)
      .eq("type", "missing_asset")
      .eq("status", "open")
      .limit(1);
    if (existing && existing.length > 0) continue;

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

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { data: { created } };
}
