"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { scanTenantAlerts } from "@/lib/alertScan";
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
 * Admin-triggered alert scan. Runs the same detection logic as
 * /api/cron/alert-scan (warranty, unassigned, missing, geofence breach) but
 * for the caller's tenant only, with the service role so it doesn't need
 * elevated table access itself.
 */
export async function runAlertScan() {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "asset_manager") {
    return { error: "Only asset managers and admins can run the alert scan." };
  }

  const supabase = createAdminClient();
  const created = await scanTenantAlerts(supabase, session.profile.tenant_id);

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { data: { created } };
}
