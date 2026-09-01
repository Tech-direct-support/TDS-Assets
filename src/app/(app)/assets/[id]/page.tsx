import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageAssets } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LifecycleTimeline } from "@/components/assets/LifecycleTimeline";
import { LifecycleControl } from "@/components/assets/LifecycleControl";
import { ArchiveButton } from "@/components/assets/ArchiveButton";
import {
  assetStatusTone,
  assetStatusLabel,
  severityTone,
  alertStatusTone,
  titleCase,
} from "@/lib/badgeTones";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="text-[13px] text-ink mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select(
      "*, asset_categories(name), assigned:user_profiles!assets_assigned_to_fkey(full_name, email), home:locations!assets_home_location_id_fkey(name), current:locations!assets_current_location_id_fkey(name)"
    )
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const [
    { data: lifecycleEvents },
    { data: locationHistory },
    { data: alerts },
    { data: maintenance },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from("asset_lifecycle_events")
      .select("*, changed:user_profiles(full_name)")
      .eq("asset_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("asset_location_history").select("*").eq("asset_id", id).order("recorded_at", { ascending: false }).limit(30),
    supabase.from("alerts").select("*").eq("asset_id", id).order("created_at", { ascending: false }),
    supabase.from("maintenance_records").select("*").eq("asset_id", id).order("started_at", { ascending: false }),
    supabase.from("audit_logs").select("*").eq("entity_type", "asset").eq("entity_id", id).order("created_at", { ascending: false }),
  ]);

  const canManage = canManageAssets(session.profile.role);
  const category = asset.asset_categories as unknown as { name: string } | null;
  const assignedUser = asset.assigned as unknown as { full_name: string; email: string } | null;
  const homeLocation = asset.home as unknown as { name: string } | null;
  const currentLocation = asset.current as unknown as { name: string } | null;

  return (
    <div className="pb-10">
      <PageHeader
        title={asset.name}
        description={`${asset.asset_tag} · ${category?.name ?? "Uncategorised"}`}
        actions={
          canManage ? (
            <>
              <LinkButton href={`/assets/${asset.id}/edit`} variant="outline">
                <Pencil size={14} /> Edit
              </LinkButton>
              <ArchiveButton assetId={asset.id} />
            </>
          ) : undefined
        }
      />

      <div className="px-4 md:px-6 flex items-center gap-2 -mt-2 mb-4">
        <Badge tone={assetStatusTone(asset.status)}>{assetStatusLabel(asset.status)}</Badge>
        {alerts && alerts.some((a) => a.status === "open") && (
          <Badge tone="critical">Open alert</Badge>
        )}
      </div>

      <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Lifecycle</h3>
          <LifecycleTimeline status={asset.status} />
          {canManage && (
            <div className="mt-3 pt-3 border-t border-line">
              <LifecycleControl assetId={asset.id} status={asset.status} />
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-3 flex items-center gap-1.5">
            <MapPin size={14} /> Location
          </h3>
          <div className="space-y-3">
            <Detail label="Current / Last Known" value={currentLocation?.name} />
            <Detail label="Home / Approved" value={homeLocation?.name} />
            <Detail
              label="Last Seen"
              value={asset.last_seen_at ? new Date(asset.last_seen_at).toLocaleString("en-AU") : undefined}
            />
          </div>
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-3">
        <Card>
          <Tabs
            tabs={[
              {
                label: "Overview",
                content: (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                    <Detail label="Manufacturer" value={asset.manufacturer} />
                    <Detail label="Model" value={asset.model} />
                    <Detail label="Serial Number" value={asset.serial_number} />
                    <Detail label="Tag ID" value={asset.rfid_tag} />
                    <Detail label="Purchase Date" value={asset.purchase_date} />
                    <Detail
                      label="Purchase Price"
                      value={asset.purchase_price ? `$${Number(asset.purchase_price).toLocaleString("en-AU")}` : undefined}
                    />
                    <Detail label="Supplier" value={asset.supplier} />
                    <Detail label="Assigned Person" value={assignedUser?.full_name} />
                    <Detail label="Department" value={asset.department} />
                    <Detail label="Cost Centre" value={asset.cost_centre} />
                    <Detail label="Warranty Provider" value={asset.warranty_provider} />
                    <Detail label="Warranty Start" value={asset.warranty_start} />
                    <Detail label="Warranty Expiry" value={asset.warranty_expiry} />
                  </div>
                ),
              },
              {
                label: "Lifecycle History",
                content:
                  lifecycleEvents && lifecycleEvents.length > 0 ? (
                    <div className="divide-y divide-line">
                      {lifecycleEvents.map((ev) => (
                        <div key={ev.id} className="py-2.5 flex items-start gap-3 text-[12.5px]">
                          <span className="text-ink-soft w-36 shrink-0">
                            {new Date(ev.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          <span className="text-ink">
                            {ev.from_status ? `${assetStatusLabel(ev.from_status)} → ` : "Created as "}
                            <strong>{assetStatusLabel(ev.to_status)}</strong>
                            {ev.note ? ` — ${ev.note}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No lifecycle events yet" />
                  ),
              },
              {
                label: "Location History",
                content:
                  locationHistory && locationHistory.length > 0 ? (
                    <div className="divide-y divide-line">
                      {locationHistory.map((lh) => (
                        <div key={lh.id} className="py-2.5 flex items-center gap-3 text-[12.5px]">
                          <span className="text-ink-soft w-36 shrink-0">
                            {new Date(lh.recorded_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          <span className="text-ink font-mono text-[11.5px]">
                            {lh.lat.toFixed(5)}, {lh.lng.toFixed(5)}
                          </span>
                          <Badge tone="muted">{titleCase(lh.source)}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No location history recorded yet" />
                  ),
              },
              {
                label: "Alerts",
                content:
                  alerts && alerts.length > 0 ? (
                    <div className="divide-y divide-line">
                      {alerts.map((a) => (
                        <Link
                          key={a.id}
                          href={`/alerts/${a.id}`}
                          className="py-2.5 flex items-center gap-3 text-[12.5px] hover:bg-surface-muted -mx-1 px-1"
                        >
                          <Badge tone={severityTone(a.severity)}>{titleCase(a.severity)}</Badge>
                          <span className="flex-1 text-ink truncate">{a.reason}</span>
                          <Badge tone={alertStatusTone(a.status)}>{titleCase(a.status)}</Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No alerts for this asset" />
                  ),
              },
              {
                label: "Maintenance",
                content:
                  maintenance && maintenance.length > 0 ? (
                    <div className="divide-y divide-line">
                      {maintenance.map((m) => (
                        <div key={m.id} className="py-2.5 text-[12.5px]">
                          <div className="text-ink">{m.description}</div>
                          <div className="text-ink-soft text-[11.5px] mt-0.5">
                            {m.vendor ?? "—"} · started {m.started_at} · {titleCase(m.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No maintenance records" />
                  ),
              },
              {
                label: "Audit History",
                content:
                  auditLogs && auditLogs.length > 0 ? (
                    <div className="divide-y divide-line">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="py-2.5 text-[12.5px]">
                          <span className="text-ink-soft w-36 inline-block">
                            {new Date(log.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          <span className="text-ink">{log.action.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No audit entries yet" />
                  ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
