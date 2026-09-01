"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { askAssetAssistant } from "@/lib/ai/assetAssistant";
import { suggestTicketClassification, summarizeTicketActivity } from "@/lib/ai/helpdesk";
import { explainAlert } from "@/lib/ai/alertExplain";
import { generateReportSummary } from "@/lib/ai/reportSummary";

export async function askAssistantAction(question: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const answer = await askAssetAssistant(supabase, {
    tenantId: session.profile.tenant_id,
    userId: session.userId,
    question,
  });
  return { data: answer };
}

export async function suggestTicketAction(subject: string, description: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const suggestion = await suggestTicketClassification(supabase, {
    tenantId: session.profile.tenant_id,
    userId: session.userId,
    subject,
    description,
  });
  return { data: suggestion };
}

export async function summarizeTicketAction(ticketId: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const summary = await summarizeTicketActivity(supabase, {
    tenantId: session.profile.tenant_id,
    userId: session.userId,
    ticketId,
  });
  return { data: summary };
}

export async function explainAlertAction(alertId: string) {
  const session = await requireSession();
  const supabase = await createClient();
  const explanation = await explainAlert(supabase, {
    tenantId: session.profile.tenant_id,
    userId: session.userId,
    alertId,
  });
  return { data: explanation };
}

export async function generateReportSummaryAction() {
  const session = await requireSession();
  const supabase = await createClient();
  const summary = await generateReportSummary(supabase, {
    tenantId: session.profile.tenant_id,
    userId: session.userId,
  });
  return { data: summary };
}
