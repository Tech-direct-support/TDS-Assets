"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { GeofenceShape } from "@/lib/types/database";

export interface GeofenceFormInput {
  name: string;
  location_id: string;
  shape_type: "circle" | "polygon";
  shape: GeofenceShape;
  asset_ids: string[];
}

export async function createGeofence(input: GeofenceFormInput) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("geofences")
    .insert({
      tenant_id: session.profile.tenant_id,
      name: input.name,
      location_id: input.location_id,
      shape_type: input.shape_type,
      shape: input.shape,
      enabled: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (input.asset_ids.length > 0) {
    await supabase.from("geofence_assets").insert(
      input.asset_ids.map((assetId) => ({ geofence_id: data.id, asset_id: assetId }))
    );
  }

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "geofence",
    entityId: data.id,
    action: "created",
    actorId: session.userId,
    after: data,
  });

  revalidatePath("/geofences");
  revalidatePath("/map");
  return { data };
}

export async function toggleGeofence(geofenceId: string, enabled: boolean) {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("geofences").update({ enabled }).eq("id", geofenceId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "geofence",
    entityId: geofenceId,
    action: enabled ? "enabled" : "disabled",
    actorId: session.userId,
  });

  revalidatePath("/geofences");
  revalidatePath("/map");
  return { data: true };
}
