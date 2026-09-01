import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewTicketForm } from "@/components/helpdesk/NewTicketForm";

export default async function NewTicketPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, asset_tag, name")
    .eq("tenant_id", session.profile.tenant_id)
    .eq("archived", false)
    .order("name");

  return (
    <div className="pb-10">
      <PageHeader title="New Ticket" description="Report an asset issue, tracking problem, or general request." />
      <div className="px-4 md:px-6">
        <NewTicketForm assets={assets ?? []} />
      </div>
    </div>
  );
}
