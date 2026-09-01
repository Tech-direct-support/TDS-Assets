import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import {
  getAssetsByStatus,
  getAssetsByCategory,
  getAssetsByLocation,
  getWarrantyExpiring,
} from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { ReportSummaryPanel } from "@/components/reports/ReportSummaryPanel";
import { assetStatusTone, assetStatusLabel, titleCase } from "@/lib/badgeTones";

export default async function ReportsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [byStatus, byCategory, byLocation, warrantyExpiring, { data: missingAssets }, { data: openAlerts }, { data: valueByCategory }, { data: recentMoves }] =
    await Promise.all([
      getAssetsByStatus(supabase, tenantId),
      getAssetsByCategory(supabase, tenantId),
      getAssetsByLocation(supabase, tenantId),
      getWarrantyExpiring(supabase, tenantId, 90),
      supabase.from("assets").select("id, asset_tag, name, status, locations!assets_current_location_id_fkey(name)").eq("tenant_id", tenantId).eq("status", "missing"),
      supabase.from("alerts").select("*, assets(asset_tag)").eq("tenant_id", tenantId).eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("assets").select("purchase_price, asset_categories(name)").eq("tenant_id", tenantId).eq("archived", false),
      supabase
        .from("asset_location_history")
        .select("recorded_at, assets(asset_tag, name)")
        .eq("tenant_id", tenantId)
        .order("recorded_at", { ascending: false })
        .limit(15),
    ]);

  const valueMap = new Map<string, number>();
  for (const row of valueByCategory ?? []) {
    const cat = row.asset_categories as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(cat) ? cat[0]?.name : cat?.name;
    const key = name ?? "Uncategorised";
    valueMap.set(key, (valueMap.get(key) ?? 0) + Number(row.purchase_price ?? 0));
  }
  const totalValue = Array.from(valueMap.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="pb-10">
      <PageHeader
        title="Reports"
        description="Operational reporting across the asset estate."
        actions={<ReportSummaryPanel />}
      />

      <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader title="Assets by status" />
          <HorizontalBarChart data={byStatus.map((s) => ({ name: s.label, count: s.count, critical: s.status === "missing" }))} />
        </Card>
        <Card>
          <CardHeader title="Assets by category" />
          <HorizontalBarChart data={byCategory.map((c) => ({ name: c.name, count: c.count }))} />
        </Card>
        <Card>
          <CardHeader title="Assets by location" />
          <HorizontalBarChart data={byLocation.map((l) => ({ name: l.name, count: l.count }))} />
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card padded={false}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Missing assets</h3>
            <ExportCsvButton
              filename="missing-assets.csv"
              rows={(missingAssets ?? []).map((a) => ({
                asset_tag: a.asset_tag,
                name: a.name,
                location: (a.locations as unknown as { name?: string } | null)?.name ?? "",
              }))}
            />
          </div>
          {!missingAssets || missingAssets.length === 0 ? (
            <EmptyState title="No missing assets" />
          ) : (
            <div className="divide-y divide-line mt-3">
              {missingAssets.map((a) => (
                <Link key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-surface-muted">
                  <span>{a.name} <span className="text-ink-soft font-mono text-[11.5px]">{a.asset_tag}</span></span>
                  <Badge tone={assetStatusTone(a.status)}>{assetStatusLabel(a.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Open alerts</h3>
            <ExportCsvButton
              filename="open-alerts.csv"
              rows={(openAlerts ?? []).map((a) => ({
                type: a.type,
                severity: a.severity,
                asset_tag: (a.assets as unknown as { asset_tag?: string } | null)?.asset_tag ?? "",
                reason: a.reason,
                created_at: a.created_at,
              }))}
            />
          </div>
          {!openAlerts || openAlerts.length === 0 ? (
            <EmptyState title="No open alerts" />
          ) : (
            <div className="divide-y divide-line mt-3 max-h-[280px] overflow-y-auto">
              {openAlerts.map((a) => (
                <Link key={a.id} href={`/alerts/${a.id}`} className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-surface-muted">
                  <span className="truncate">{a.reason}</span>
                  <Badge tone="attention">{titleCase(a.severity)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card padded={false}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Warranty expiry (90 days)</h3>
            <ExportCsvButton
              filename="warranty-expiry.csv"
              rows={warrantyExpiring.map((a) => ({ asset_tag: a.asset_tag, name: a.name, warranty_expiry: a.warranty_expiry, provider: a.warranty_provider }))}
            />
          </div>
          {warrantyExpiring.length === 0 ? (
            <EmptyState title="Nothing expiring within 90 days" />
          ) : (
            <div className="divide-y divide-line mt-3 max-h-[280px] overflow-y-auto">
              {warrantyExpiring.map((a) => (
                <Link key={a.id} href={`/assets/${a.id}`} className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-surface-muted">
                  <span>{a.name} <span className="text-ink-soft font-mono text-[11.5px]">{a.asset_tag}</span></span>
                  <span className="text-ink-soft">{a.warranty_expiry}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Recently moved assets</h3>
          </div>
          {!recentMoves || recentMoves.length === 0 ? (
            <EmptyState title="No location updates recorded yet" />
          ) : (
            <div className="divide-y divide-line mt-3 max-h-[280px] overflow-y-auto">
              {recentMoves.map((m, i) => {
                const asset = m.assets as unknown as { asset_tag: string; name: string } | null;
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <span>{asset?.name} <span className="text-ink-soft font-mono text-[11.5px]">{asset?.asset_tag}</span></span>
                    <span className="text-ink-soft text-[11.5px]">{new Date(m.recorded_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="px-4 md:px-6 mt-3">
        <Card padded={false}>
          <div className="px-4 pt-4">
            <h3 className="text-[13px] font-semibold text-ink">Asset value by category</h3>
            <p className="text-[12px] text-ink-soft mt-0.5">Total estate value: ${totalValue.toLocaleString("en-AU")}</p>
          </div>
          <div className="divide-y divide-line mt-3">
            {Array.from(valueMap, ([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .map((row) => (
                <div key={row.name} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span className="text-ink">{row.name}</span>
                  <span className="text-ink-soft">${row.value.toLocaleString("en-AU")}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
