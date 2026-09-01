import Link from "next/link";
import { Plus, Radar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageAssets } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { GeofenceToggle } from "@/components/geofences/GeofenceToggle";

export default async function GeofencesPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const { data: geofences } = await supabase
    .from("geofences")
    .select("*, locations(name), geofence_assets(asset_id, assets(asset_tag, name))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const canManage = canManageAssets(session.profile.role);

  return (
    <div className="pb-10">
      <PageHeader
        title="Geofences"
        description="Approved zones assets are expected to remain within."
        actions={canManage ? <LinkButton href="/geofences/new" variant="primary"><Plus size={14} /> New Geofence</LinkButton> : undefined}
      />

      <div className="px-4 md:px-6">
        {!geofences || geofences.length === 0 ? (
          <Card>
            <EmptyState
              title="No geofences yet"
              description='Create one, e.g. "Projector PRJ-005 must remain inside Sydney HQ."'
              action={canManage ? <LinkButton href="/geofences/new" variant="primary"><Plus size={14} /> New Geofence</LinkButton> : undefined}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {geofences.map((g) => {
              const location = g.locations as unknown as { name: string } | null;
              const assignments = (g.geofence_assets as unknown as { asset_id: string; assets: { asset_tag: string; name: string } | null }[]) ?? [];
              return (
                <Card key={g.id}>
                  <div className="flex items-start justify-between">
                    <h3 className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
                      <Radar size={14} className="text-red" /> {g.name}
                    </h3>
                    {canManage && <GeofenceToggle geofenceId={g.id} enabled={g.enabled} />}
                  </div>
                  <p className="text-[12px] text-ink-soft mt-1">{location?.name ?? "Unknown site"}</p>
                  <div className="mt-3 pt-3 border-t border-line">
                    <p className="text-[11px] text-ink-soft mb-1">
                      {assignments.length === 0 ? "Applies to all assets at this site" : "Governs:"}
                    </p>
                    {assignments.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assignments.slice(0, 4).map((a) => (
                          <Link
                            key={a.asset_id}
                            href={`/assets/${a.asset_id}`}
                            className="text-[11px] font-mono bg-surface-sunken px-1.5 py-0.5 rounded-[3px] hover:bg-black hover:text-white transition-colors"
                          >
                            {a.assets?.asset_tag}
                          </Link>
                        ))}
                        {assignments.length > 4 && (
                          <span className="text-[11px] text-ink-soft">+{assignments.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
