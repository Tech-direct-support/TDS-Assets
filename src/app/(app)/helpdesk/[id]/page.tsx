import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TicketStatusControl } from "@/components/helpdesk/TicketStatusControl";
import { TicketAiPanel } from "@/components/helpdesk/TicketAiPanel";
import { TicketComments } from "@/components/helpdesk/TicketComments";
import { TicketAttachments } from "@/components/helpdesk/TicketAttachments";
import { getSignedUrls, TICKET_ATTACHMENTS_BUCKET } from "@/lib/storage";
import { assetStatusTone, assetStatusLabel, ticketPriorityTone, titleCase } from "@/lib/badgeTones";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="text-[13px] text-ink mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("helpdesk_tickets")
    .select(
      "*, assets(id, asset_tag, name, status, current:locations!assets_current_location_id_fkey(name)), requester:user_profiles!helpdesk_tickets_requester_id_fkey(full_name, email)"
    )
    .eq("id", id)
    .eq("tenant_id", session.profile.tenant_id)
    .single();

  if (!ticket) notFound();

  const { data: rawComments } = await supabase
    .from("ticket_comments")
    .select("id, body, is_ai, created_at, author:user_profiles(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const comments = (rawComments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    is_ai: c.is_ai,
    created_at: c.created_at,
    author: c.is_ai ? "AI Assistant" : (c.author as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
  }));

  const { data: rawAttachments } = await supabase
    .from("ticket_attachments")
    .select("id, file_name, file_url, created_at, uploader:user_profiles(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: false });

  const signedUrls = await getSignedUrls(
    supabase,
    TICKET_ATTACHMENTS_BUCKET,
    (rawAttachments ?? []).map((a) => a.file_url)
  );

  const attachments = (rawAttachments ?? []).map((a) => ({
    id: a.id,
    file_name: a.file_name,
    url: signedUrls[a.file_url] ?? null,
    created_at: a.created_at,
    uploader: (a.uploader as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
  }));

  const asset = ticket.assets as unknown as { id: string; asset_tag: string; name: string; status: string; current: { name: string } | null } | null;
  const requester = ticket.requester as unknown as { full_name: string; email: string } | null;

  return (
    <div className="pb-10">
      <PageHeader
        title={ticket.subject}
        description={`Ticket · ${titleCase(ticket.category)} · opened ${new Date(ticket.created_at).toLocaleDateString("en-AU")}`}
        actions={<TicketStatusControl ticketId={ticket.id} status={ticket.status} />}
      />

      <div className="px-4 md:px-6 flex items-center gap-2 -mt-2 mb-4">
        <Badge tone={ticketPriorityTone(ticket.priority)}>{titleCase(ticket.priority)} priority</Badge>
      </div>

      <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-2">Description</h3>
            <p className="text-[13px] text-ink whitespace-pre-wrap">{ticket.description}</p>
          </Card>

          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">AI assistance</h3>
            <TicketAiPanel ticketId={ticket.id} subject={ticket.subject} description={ticket.description} />
          </Card>

          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Attachments</h3>
            <TicketAttachments ticketId={ticket.id} attachments={attachments} />
          </Card>

          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Activity</h3>
            <TicketComments ticketId={ticket.id} comments={comments} />
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Requester</h3>
            <Detail label="Name" value={requester?.full_name} />
            <div className="mt-3"><Detail label="Email" value={requester?.email} /></div>
          </Card>

          <Card>
            <h3 className="text-[13px] font-semibold text-ink mb-3">Related asset</h3>
            {asset ? (
              <Link href={`/assets/${asset.id}`} className="block hover:bg-surface-muted -mx-1 px-1 py-1 rounded-[3px]">
                <div className="text-[13px] text-ink font-medium">{asset.name}</div>
                <div className="text-[11.5px] text-ink-soft font-mono mb-1.5">{asset.asset_tag}</div>
                <div className="flex items-center gap-2">
                  <Badge tone={assetStatusTone(asset.status as never)}>{assetStatusLabel(asset.status as never)}</Badge>
                  <span className="text-[11.5px] text-ink-soft">{asset.current?.name ?? "—"}</span>
                </div>
              </Link>
            ) : (
              <p className="text-[12px] text-ink-soft">No asset linked to this ticket.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
