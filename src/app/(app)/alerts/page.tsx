import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageAssets } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { severityTone, alertStatusTone, titleCase } from "@/lib/badgeTones";
import { RunScanButton } from "@/components/alerts/RunScanButton";
import type { AlertStatus, AlertSeverity } from "@/lib/types/database";

const PAGE_SIZE = 25;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const status = sp.status ?? "";
  const severity = sp.severity ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  let query = supabase
    .from("alerts")
    .select("*, assets(asset_tag, name), locations(name)", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status as AlertStatus);
  if (severity) query = query.eq("severity", severity as AlertSeverity);

  const { data: alerts, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const canManage = canManageAssets(session.profile.role);

  return (
    <div className="pb-10">
      <PageHeader
        title="Alerts"
        description="Geofence breaches, missing assets, warranty expiry, and other operational alerts."
        actions={canManage ? <RunScanButton /> : undefined}
      />

      <div className="px-4 md:px-6 flex flex-wrap gap-2 mb-3">
        {["", "open", "acknowledged", "investigating", "resolved"].map((s) => (
          <Link
            key={s}
            href={`/alerts${s ? `?status=${s}` : ""}`}
            className={`px-2.5 py-1 text-[12px] rounded-[3px] border ${
              status === s ? "bg-black text-white border-black" : "bg-white text-ink-soft border-line-strong hover:border-black"
            }`}
          >
            {s ? titleCase(s) : "All statuses"}
          </Link>
        ))}
      </div>

      <div className="px-4 md:px-6">
        <div className="bg-white border border-line rounded-[3px] overflow-hidden">
          {!alerts || alerts.length === 0 ? (
            <EmptyState title="No alerts" description="Nothing matches the current filter." />
          ) : (
            <>
              <div className="divide-y divide-line">
                {alerts.map((a) => (
                  <Link key={a.id} href={`/alerts/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors">
                    <Badge tone={severityTone(a.severity)}>{titleCase(a.severity)}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-ink truncate">{a.reason}</div>
                      <div className="text-[11.5px] text-ink-soft mt-0.5">
                        {titleCase(a.type)} · {(a.assets as { asset_tag?: string } | null)?.asset_tag ?? "—"} ·{" "}
                        {(a.locations as { name?: string } | null)?.name ?? "Unknown site"} ·{" "}
                        {new Date(a.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                    <Badge tone={alertStatusTone(a.status)}>{titleCase(a.status)}</Badge>
                  </Link>
                ))}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/alerts" searchParams={{ status, severity }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
