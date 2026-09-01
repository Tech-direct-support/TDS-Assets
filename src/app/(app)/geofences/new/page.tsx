import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { GeofenceForm } from "@/components/geofences/GeofenceForm";

export default async function NewGeofencePage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [{ data: locations }, { data: assets }] = await Promise.all([
    supabase.from("locations").select("id, name, lat, lng").eq("tenant_id", tenantId).order("name"),
    supabase.from("assets").select("id, asset_tag, name, home_location_id").eq("tenant_id", tenantId).eq("archived", false).order("name"),
  ]);

  return (
    <div className="pb-10">
      <PageHeader title="New Geofence" description='Define an approved zone, e.g. "Projector PRJ-005 must remain inside Sydney HQ."' />
      <div className="px-4 md:px-6">
        <GeofenceForm locations={locations ?? []} assets={assets ?? []} />
      </div>
    </div>
  );
}
