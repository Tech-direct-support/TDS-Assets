import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { MapClientLoader } from "@/components/map/MapClientLoader";
import type { MapAsset, MapGeofence } from "@/components/map/MapView";

export default async function MapPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [{ data: assets }, { data: geofences }, { data: locations }, { data: openAlerts }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id, asset_tag, name, status, current_lat, current_lng, home:locations!assets_home_location_id_fkey(lat, lng), current:locations!assets_current_location_id_fkey(name), assigned:user_profiles!assets_assigned_to_fkey(full_name)"
      )
      .eq("tenant_id", tenantId)
      .eq("archived", false),
    supabase.from("geofences").select("id, name, shape_type, shape, enabled, location_id").eq("tenant_id", tenantId),
    supabase.from("locations").select("id, lat, lng").eq("tenant_id", tenantId),
    supabase.from("alerts").select("asset_id").eq("tenant_id", tenantId).eq("status", "open"),
  ]);

  const assetsWithAlert = new Set((openAlerts ?? []).map((a) => a.asset_id));

  const mapAssets: MapAsset[] = (assets ?? [])
    .map((a) => {
      const home = a.home as unknown as { lat: number; lng: number } | null;
      const current = a.current as unknown as { name: string } | null;
      const assigned = a.assigned as unknown as { full_name: string } | null;
      const lat = a.current_lat ?? home?.lat;
      const lng = a.current_lng ?? home?.lng;
      if (lat == null || lng == null) return null;
      return {
        id: a.id,
        asset_tag: a.asset_tag,
        name: a.name,
        status: a.status,
        lat,
        lng,
        assignedTo: assigned?.full_name ?? null,
        locationName: current?.name ?? null,
        hasOpenAlert: assetsWithAlert.has(a.id),
      };
    })
    .filter((a): a is MapAsset => a !== null);

  const mapGeofences: MapGeofence[] = (geofences ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    shape_type: g.shape_type,
    shape: g.shape,
    enabled: g.enabled,
  }));

  const center: [number, number] =
    mapAssets.length > 0
      ? [mapAssets[0].lat, mapAssets[0].lng]
      : locations && locations.length > 0
      ? [locations[0].lat, locations[0].lng]
      : [-33.8688, 151.2093];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Asset Map"
        description="Live positions and approved zones. Enable Simulation Mode to move an asset and test geofence breach detection."
      />
      <div className="flex-1 px-4 md:px-6 pb-6 min-h-[520px]">
        <div className="h-full w-full border border-line rounded-[3px] overflow-hidden">
          <MapClientLoader assets={mapAssets} geofences={mapGeofences} center={center} />
        </div>
      </div>
    </div>
  );
}
