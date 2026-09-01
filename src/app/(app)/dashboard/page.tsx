import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import {
  getFleetSummary,
  getAssetsByCategory,
  getAssetsByLocation,
  getAssetsByStatus,
  getWarrantyExpiring,
  getRecentAlerts,
  getRecentActivity,
} from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { severityTone, alertStatusTone, titleCase } from "@/lib/badgeTones";

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [summary, byCategory, byLocation, byStatus, warrantyExpiring, recentAlerts, recentActivity] =
    await Promise.all([
      getFleetSummary(supabase, tenantId),
      getAssetsByCategory(supabase, tenantId),
      getAssetsByLocation(supabase, tenantId),
      getAssetsByStatus(supabase, tenantId),
      getWarrantyExpiring(supabase, tenantId, 60),
      getRecentAlerts(supabase, tenantId, 6),
      getRecentActivity(supabase, tenantId, 8),
    ]);

  return (
    <div className="pb-10">
      <PageHeader
        title="Dashboard"
        description="A live view of estate health across your assets, locations, and alerts."
      />

      <div className="px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-3">
        <StatTile label="Total Assets" value={summary.total} />
        <StatTile label="Active" value={summary.active} />
        <StatTile label="In Stock" value={summary.inStock} />
        <StatTile label="Assigned" value={summary.assigned} />
        <StatTile label="In Use" value={summary.inUse} />
        <StatTile label="Maintenance" value={summary.maintenance} />
        <StatTile label="Missing" value={summary.missing} emphasis={summary.missing > 0} />
        <StatTile label="Unassigned" value={summary.unassigned} />
        <StatTile label="Open Alerts" value={summary.openAlerts} emphasis={summary.openAlerts > 0} />
      </div>

      <div className="px-4 md:px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader title="Assets by category" />
          {byCategory.length ? (
            <HorizontalBarChart data={byCategory.map((c) => ({ name: c.name, count: c.count }))} />
          ) : (
            <EmptyState title="No assets yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Assets by location" />
          {byLocation.length ? (
            <HorizontalBarChart data={byLocation.map((l) => ({ name: l.name, count: l.count }))} />
          ) : (
            <EmptyState title="No assets yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Assets by status" />
          {byStatus.length ? (
            <HorizontalBarChart
              data={byStatus.map((s) => ({ name: s.label, count: s.count, critical: s.status === "missing" }))}
            />
          ) : (
            <EmptyState title="No assets yet" />
          )}
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Recent alerts</h3>
            <Link href="/alerts" className="text-[12px] text-red font-medium hover:underline">
              View all
            </Link>
          </div>
          {recentAlerts.length === 0 ? (
            <EmptyState title="No alerts" description="Nothing needs attention right now." />
          ) : (
            <div className="mt-3 divide-y divide-line">
              {recentAlerts.map((a) => (
                <Link
                  key={a.id}
                  href={`/alerts/${a.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors"
                >
                  <Badge tone={severityTone(a.severity)}>{titleCase(a.severity)}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-ink truncate">{a.reason}</div>
                    <div className="text-[11px] text-ink-soft">
                      {(a.assets as { asset_tag?: string } | null)?.asset_tag ?? "—"} ·{" "}
                      {(a.locations as { name?: string } | null)?.name ?? "Unknown site"} ·{" "}
                      {new Date(a.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                  <Badge tone={alertStatusTone(a.status)}>{titleCase(a.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Warranty expiry (60 days)</h3>
          </div>
          {warrantyExpiring.length === 0 ? (
            <EmptyState title="Nothing expiring soon" />
          ) : (
            <div className="mt-3 divide-y divide-line max-h-[280px] overflow-y-auto">
              {warrantyExpiring.map((a) => (
                <Link
                  key={a.id}
                  href={`/assets/${a.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-muted transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink truncate">{a.name}</div>
                    <div className="text-[11px] text-ink-soft">{a.asset_tag}</div>
                  </div>
                  <div className="text-[12px] text-ink-soft shrink-0">{a.warranty_expiry}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-4">
        <Card padded={false}>
          <div className="px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Recent asset activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState title="No activity recorded yet" />
          ) : (
            <div className="mt-3 divide-y divide-line">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2 text-[12px]">
                  <span className="text-ink-soft w-36 shrink-0">
                    {new Date(log.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="text-ink">
                    {titleCase(log.entity_type)} {log.action.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
