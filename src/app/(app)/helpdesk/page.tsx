import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { ticketStatusTone, ticketPriorityTone, titleCase } from "@/lib/badgeTones";
import type { TicketStatus } from "@/lib/types/database";

const PAGE_SIZE = 25;

export default async function HelpdeskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const status = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  let query = supabase
    .from("helpdesk_tickets")
    .select("*, assets(asset_tag, name), requester:user_profiles!helpdesk_tickets_requester_id_fkey(full_name)", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (status) query = query.eq("status", status as TicketStatus);

  const { data: tickets, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div className="pb-10">
      <PageHeader
        title="Helpdesk"
        description="Asset-related support requests and incidents."
        actions={<LinkButton href="/helpdesk/new" variant="primary"><Plus size={14} /> New Ticket</LinkButton>}
      />

      <div className="px-4 md:px-6 flex flex-wrap gap-2 mb-3">
        {["", "open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
          <Link
            key={s}
            href={`/helpdesk${s ? `?status=${s}` : ""}`}
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
          {!tickets || tickets.length === 0 ? (
            <EmptyState
              title="No tickets"
              description="Nothing matches the current filter."
              action={<LinkButton href="/helpdesk/new" variant="primary"><Plus size={14} /> New Ticket</LinkButton>}
            />
          ) : (
            <>
              <div className="divide-y divide-line">
                {tickets.map((t) => {
                  const asset = t.assets as unknown as { asset_tag: string; name: string } | null;
                  const requester = t.requester as unknown as { full_name: string } | null;
                  return (
                    <Link key={t.id} href={`/helpdesk/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors">
                      <Badge tone={ticketPriorityTone(t.priority)}>{titleCase(t.priority)}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-ink truncate">{t.subject}</div>
                        <div className="text-[11.5px] text-ink-soft mt-0.5">
                          {titleCase(t.category)} · {requester?.full_name ?? "Unknown"}
                          {asset ? ` · ${asset.asset_tag}` : ""} ·{" "}
                          {new Date(t.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                      <Badge tone={ticketStatusTone(t.status)}>{titleCase(t.status.replace("_", " "))}</Badge>
                    </Link>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/helpdesk" searchParams={{ status }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
