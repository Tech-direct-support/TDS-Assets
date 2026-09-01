import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageAssets } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewLocationDialog } from "@/components/locations/NewLocationDialog";

export default async function LocationsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const { data: locations } = await supabase
    .from("locations")
    .select("*, assets(count), geofences(count)")
    .eq("tenant_id", tenantId)
    .order("name");

  const { data: openAlerts } = await supabase
    .from("alerts")
    .select("location_id")
    .eq("tenant_id", tenantId)
    .eq("status", "open");

  const alertCountByLocation = new Map<string, number>();
  for (const a of openAlerts ?? []) {
    if (!a.location_id) continue;
    alertCountByLocation.set(a.location_id, (alertCountByLocation.get(a.location_id) ?? 0) + 1);
  }

  const canManage = canManageAssets(session.profile.role);

  return (
    <div className="pb-10">
      <PageHeader
        title="Locations"
        description="Sites your assets are homed to and tracked against."
        actions={canManage ? <NewLocationDialog /> : undefined}
      />

      <div className="px-4 md:px-6">
        {!locations || locations.length === 0 ? (
          <Card>
            <EmptyState
              title="No locations yet"
              description="Add your first site to begin homing assets and geofences to it."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc) => {
              const assetCount = (loc.assets as unknown as { count: number }[])?.[0]?.count ?? 0;
              const geofenceCount = (loc.geofences as unknown as { count: number }[])?.[0]?.count ?? 0;
              const alertCount = alertCountByLocation.get(loc.id) ?? 0;
              return (
                <Link key={loc.id} href={`/locations/${loc.id}`}>
                  <Card className="h-full hover:border-black transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
                        <MapPin size={14} className="text-red" /> {loc.name}
                      </h3>
                      {alertCount > 0 && (
                        <span className="text-[10px] font-semibold bg-red text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {alertCount}
                        </span>
                      )}
                    </div>
                    {loc.address && <p className="text-[12px] text-ink-soft mt-1">{loc.address}</p>}
                    {loc.contact_name && (
                      <p className="text-[12px] text-ink-soft mt-1 flex items-center gap-1">
                        <Phone size={11} /> {loc.contact_name} {loc.contact_phone ? `· ${loc.contact_phone}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line text-[12px]">
                      <span className="text-ink"><strong>{assetCount}</strong> <span className="text-ink-soft">assets</span></span>
                      <span className="text-ink"><strong>{geofenceCount}</strong> <span className="text-ink-soft">geofences</span></span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
