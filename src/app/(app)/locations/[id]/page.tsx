import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { assetStatusTone, assetStatusLabel } from "@/lib/badgeTones";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", session.profile.tenant_id)
    .single();

  if (!location) notFound();

  const [{ data: assets }, { data: geofences }, { count: openAlerts }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, asset_tag, name, status")
      .eq("current_location_id", id)
      .eq("archived", false)
      .order("name"),
    supabase.from("geofences").select("*").eq("location_id", id),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("location_id", id).eq("status", "open"),
  ]);

  return (
    <div className="pb-10">
      <PageHeader
        title={location.name}
        description={location.address ?? undefined}
        actions={
          <Link href={`/map?location=${location.id}`} className="text-[13px] text-red font-medium hover:underline">
            View on map
          </Link>
        }
      />

      <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-3">Site details</h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-1.5 text-ink"><MapPin size={13} className="text-ink-soft" /> {location.address ?? "No address on file"}</div>
            {location.contact_name && (
              <div className="flex items-center gap-1.5 text-ink"><Phone size={13} className="text-ink-soft" /> {location.contact_name} {location.contact_phone ?? ""}</div>
            )}
            <div className="text-ink-soft text-[12px] font-mono">{location.lat}, {location.lng}</div>
          </div>
        </Card>
        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-1">Assets</h3>
          <div className="text-[26px] font-semibold text-ink">{assets?.length ?? 0}</div>
        </Card>
        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-1">Open alerts</h3>
          <div className={`text-[26px] font-semibold ${openAlerts ? "text-red" : "text-ink"}`}>{openAlerts ?? 0}</div>
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card padded={false}>
          <h3 className="text-[13px] font-semibold text-ink px-4 pt-4">Geofences at this site</h3>
          {!geofences || geofences.length === 0 ? (
            <EmptyState title="No geofences configured" />
          ) : (
            <div className="divide-y divide-line mt-3">
              {geofences.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span className="text-ink">{g.name}</span>
                  <Badge tone={g.enabled ? "dark" : "muted"}>{g.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <h3 className="text-[13px] font-semibold text-ink px-4 pt-4">Assets at this site</h3>
          {!assets || assets.length === 0 ? (
            <EmptyState title="No assets currently located here" />
          ) : (
            <div className="divide-y divide-line mt-3 max-h-[380px] overflow-y-auto">
              {assets.map((a) => (
                <Link key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-surface-muted">
                  <div>
                    <div className="text-ink">{a.name}</div>
                    <div className="text-ink-soft text-[11.5px] font-mono">{a.asset_tag}</div>
                  </div>
                  <Badge tone={assetStatusTone(a.status)}>{assetStatusLabel(a.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
