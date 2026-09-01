import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { titleCase } from "@/lib/badgeTones";

const PAGE_SIZE = 40;

const ENTITY_LINK: Record<string, (id: string) => string> = {
  asset: (id) => `/assets/${id}`,
  alert: (id) => `/alerts/${id}`,
  ticket: (id) => `/helpdesk/${id}`,
  geofence: () => `/geofences`,
  location: (id) => `/locations/${id}`,
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const entityType = sp.entity ?? "";

  let query = supabase
    .from("audit_logs")
    .select("*, actor:user_profiles(full_name)", { count: "exact" })
    .eq("tenant_id", session.profile.tenant_id);

  if (entityType) query = query.eq("entity_type", entityType);

  const { data: logs, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const entityTypes = ["asset", "alert", "ticket", "geofence", "location", "asset_import"];

  return (
    <div className="pb-10">
      <PageHeader title="Audit History" description="A record of every meaningful change made across the platform." />

      <div className="px-4 md:px-6 flex flex-wrap gap-2 mb-3">
        <Link
          href="/audit"
          className={`px-2.5 py-1 text-[12px] rounded-[3px] border ${!entityType ? "bg-black text-white border-black" : "bg-white text-ink-soft border-line-strong hover:border-black"}`}
        >
          All
        </Link>
        {entityTypes.map((t) => (
          <Link
            key={t}
            href={`/audit?entity=${t}`}
            className={`px-2.5 py-1 text-[12px] rounded-[3px] border capitalize ${entityType === t ? "bg-black text-white border-black" : "bg-white text-ink-soft border-line-strong hover:border-black"}`}
          >
            {t.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="px-4 md:px-6">
        <div className="bg-white border border-line rounded-[3px] overflow-hidden">
          {!logs || logs.length === 0 ? (
            <EmptyState title="No audit entries" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="text-left font-medium px-3 py-2.5">Time</th>
                      <th className="text-left font-medium px-3 py-2.5">Entity</th>
                      <th className="text-left font-medium px-3 py-2.5">Action</th>
                      <th className="text-left font-medium px-3 py-2.5">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const actor = log.actor as unknown as { full_name: string } | null;
                      const link = ENTITY_LINK[log.entity_type]?.(log.entity_id);
                      return (
                        <tr key={log.id} className={`border-t border-line ${i % 2 === 1 ? "bg-surface-muted" : "bg-white"}`}>
                          <td className="px-3 py-2 text-ink-soft whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="px-3 py-2 text-ink capitalize">
                            {link ? <Link href={link} className="hover:text-red">{titleCase(log.entity_type)}</Link> : titleCase(log.entity_type)}
                          </td>
                          <td className="px-3 py-2 text-ink-soft">{log.action.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-ink-soft">{actor?.full_name ?? "System"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/audit" searchParams={{ entity: entityType }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
