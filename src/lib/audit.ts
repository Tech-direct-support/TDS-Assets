import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }
) {
  await supabase.from("audit_logs").insert({
    tenant_id: params.tenantId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor_id: params.actorId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
