"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/database";

export interface TicketFormInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  related_asset_id: string | null;
}

export async function createTicket(input: TicketFormInput) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("helpdesk_tickets")
    .insert({
      ...input,
      tenant_id: session.profile.tenant_id,
      requester_id: session.userId,
      status: "open" as TicketStatus,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "ticket",
    entityId: data.id,
    action: "created",
    actorId: session.userId,
    after: data,
  });

  revalidatePath("/helpdesk");
  return { data };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("helpdesk_tickets").update({ status }).eq("id", ticketId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "ticket",
    entityId: ticketId,
    action: "status_changed",
    actorId: session.userId,
    after: { status },
  });

  revalidatePath("/helpdesk");
  revalidatePath(`/helpdesk/${ticketId}`);
  return { data: true };
}

export async function updateTicketFields(
  ticketId: string,
  fields: Partial<Pick<TicketFormInput, "category" | "priority" | "related_asset_id">>
) {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("helpdesk_tickets").update(fields).eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/helpdesk/${ticketId}`);
  return { data: true };
}

export async function addTicketComment(ticketId: string, body: string, isAi = false) {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("ticket_comments").insert({
    tenant_id: session.profile.tenant_id,
    ticket_id: ticketId,
    author_id: session.userId,
    body,
    is_ai: isAi,
  });
  if (error) return { error: error.message };

  revalidatePath(`/helpdesk/${ticketId}`);
  return { data: true };
}
