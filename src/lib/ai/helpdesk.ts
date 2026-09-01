import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "./provider";
import { logAiConversation } from "./log";
import type { TicketCategory, TicketPriority } from "@/lib/types/database";

export interface TicketSuggestion {
  category: TicketCategory;
  priority: TicketPriority;
  related_asset_tag: string | null;
  suggested_response: string;
  suggested_action: string;
  summary: string;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  asset_issue: "Asset Issue",
  tracking_issue: "Tracking Issue",
  missing_asset: "Missing Asset",
  maintenance: "Maintenance",
  access: "Access",
  general_support: "General Support",
};

function ruleBasedSuggestion(
  text: string,
  candidates: { asset_tag: string; name: string }[]
): TicketSuggestion {
  const t = text.toLowerCase();

  let category: TicketCategory = "general_support";
  let priority: TicketPriority = "low";
  let suggested_action = "Review the request and respond to the requester with next steps.";

  if (/stolen|lost|missing|can'?t find|cannot find/.test(t)) {
    category = "missing_asset";
    priority = "critical";
    suggested_action = "Verify the asset's last known location and notify the asset or security administrator.";
  } else if (/geofence|gps|tracking|location|breach/.test(t)) {
    category = "tracking_issue";
    priority = "high";
    suggested_action = "Check the asset's recent location history and confirm whether the movement was authorised.";
  } else if (/broken|fault|not working|damaged|crack|error/.test(t)) {
    category = "asset_issue";
    priority = "medium";
    suggested_action = "Confirm the fault with the requester and log a maintenance record if hardware service is required.";
  } else if (/maintenance|service|repair|inspection/.test(t)) {
    category = "maintenance";
    priority = "medium";
    suggested_action = "Schedule the asset for maintenance and update its lifecycle status accordingly.";
  } else if (/access|login|password|permission|locked out/.test(t)) {
    category = "access";
    priority = "low";
    suggested_action = "Verify the requester's identity and update their access or credentials.";
  }

  const tagMatch = text.match(/\b[A-Z]{2,5}-\d{2,6}\b/i);
  const nameMatch = candidates.find((c) => t.includes(c.name.toLowerCase()));
  const related_asset_tag = tagMatch?.[0]?.toUpperCase() ?? nameMatch?.asset_tag ?? null;

  return {
    category,
    priority,
    related_asset_tag,
    suggested_action,
    suggested_response: `Thanks for reporting this. We've classified it as ${CATEGORY_LABELS[category]} (${priority} priority)${
      related_asset_tag ? ` and linked it to asset ${related_asset_tag}` : ""
    }. ${suggested_action}`,
    summary: text.length > 160 ? `${text.slice(0, 157)}...` : text,
  };
}

export async function suggestTicketClassification(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; subject: string; description: string }
): Promise<TicketSuggestion> {
  const { data: candidates } = await supabase
    .from("assets")
    .select("asset_tag, name")
    .eq("tenant_id", params.tenantId)
    .eq("archived", false)
    .limit(500);

  const text = `${params.subject}\n${params.description}`;
  const provider = getAIProvider();
  const fallback = ruleBasedSuggestion(text, candidates ?? []);

  if (!provider) {
    await logAiConversation(supabase, {
      tenantId: params.tenantId,
      userId: params.userId,
      context: "helpdesk",
      provider: "rule_based",
      prompt: text,
      response: JSON.stringify(fallback),
    });
    return fallback;
  }

  try {
    const raw = await provider.generateText({
      system:
        `You triage IT/asset helpdesk tickets for an enterprise asset management platform. ` +
        `Respond with ONLY a compact JSON object with keys: category (one of ${Object.keys(CATEGORY_LABELS).join(", ")}), ` +
        `priority (one of low, medium, high, critical), related_asset_tag (an asset tag string from the candidate list if it plausibly matches, else null), ` +
        `suggested_response (a short reply to the requester), suggested_action (a short next step for the operator), summary (one sentence). No markdown, no prose outside the JSON.`,
      prompt: `CANDIDATE ASSETS: ${JSON.stringify(candidates ?? [])}\n\nTICKET SUBJECT: ${params.subject}\nTICKET DESCRIPTION: ${params.description}`,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as TicketSuggestion;

    await logAiConversation(supabase, {
      tenantId: params.tenantId,
      userId: params.userId,
      context: "helpdesk",
      provider: provider.name,
      prompt: text,
      response: raw,
    });

    return {
      category: parsed.category ?? fallback.category,
      priority: parsed.priority ?? fallback.priority,
      related_asset_tag: parsed.related_asset_tag ?? fallback.related_asset_tag,
      suggested_response: parsed.suggested_response ?? fallback.suggested_response,
      suggested_action: parsed.suggested_action ?? fallback.suggested_action,
      summary: parsed.summary ?? fallback.summary,
    };
  } catch {
    return fallback;
  }
}

export async function summarizeTicketActivity(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; ticketId: string }
): Promise<string> {
  const [{ data: ticket }, { data: comments }] = await Promise.all([
    supabase.from("helpdesk_tickets").select("*, assets(asset_tag, name)").eq("id", params.ticketId).single(),
    supabase
      .from("ticket_comments")
      .select("body, is_ai, created_at")
      .eq("ticket_id", params.ticketId)
      .order("created_at", { ascending: true }),
  ]);

  const provider = getAIProvider();
  const context = { ticket, comments: comments ?? [] };

  function fallbackSummary() {
    const count = comments?.length ?? 0;
    return `This ticket ("${ticket?.subject}") has ${count} update${count === 1 ? "" : "s"} and is currently ${ticket?.status}. Priority is ${ticket?.priority}, category ${ticket?.category}${
      ticket?.assets ? `, linked to asset ${(ticket.assets as { asset_tag: string }).asset_tag}` : ""
    }.`;
  }

  let summary: string;
  let providerName = provider?.name ?? "rule_based";
  if (provider) {
    try {
      summary = await provider.generateText({
        system: "Summarize this helpdesk ticket's activity in 2-3 plain business sentences for a supervisor. No markdown.",
        prompt: JSON.stringify(context).slice(0, 8000),
      });
    } catch (err) {
      console.error("AI provider failed, falling back to rule-based ticket summary:", err);
      summary = fallbackSummary();
      providerName = "rule_based";
    }
  } else {
    summary = fallbackSummary();
  }

  await logAiConversation(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    context: "helpdesk",
    provider: providerName,
    prompt: `summarize ticket ${params.ticketId}`,
    response: summary,
  });

  return summary;
}
