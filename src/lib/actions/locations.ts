"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface LocationFormInput {
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  lat: number;
  lng: number;
}

export async function createLocation(input: LocationFormInput) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .insert({ ...input, tenant_id: session.profile.tenant_id })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "location",
    entityId: data.id,
    action: "created",
    actorId: session.userId,
    after: data,
  });

  revalidatePath("/locations");
  return { data };
}
