"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { TICKET_ATTACHMENTS_BUCKET } from "@/lib/storage";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/database";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

export async function uploadTicketAttachment(ticketId: string, formData: FormData) {
  const session = await requireSession();
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "File must be smaller than 10MB." };

  const path = `${session.profile.tenant_id}/${ticketId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(TICKET_ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("ticket_attachments").insert({
    tenant_id: session.profile.tenant_id,
    ticket_id: ticketId,
    file_name: file.name,
    file_url: path,
    uploaded_by: session.userId,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath(`/helpdesk/${ticketId}`);
  return { data: true };
}

export async function deleteTicketAttachment(attachmentId: string, ticketId: string) {
  await requireSession();
  const supabase = await createClient();

  const { data: attachment } = await supabase
    .from("ticket_attachments")
    .select("file_url")
    .eq("id", attachmentId)
    .single();

  if (attachment?.file_url) {
    await supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).remove([attachment.file_url]);
  }

  const { error } = await supabase.from("ticket_attachments").delete().eq("id", attachmentId);
  if (error) return { error: error.message };

  revalidatePath(`/helpdesk/${ticketId}`);
  return { data: true };
}
