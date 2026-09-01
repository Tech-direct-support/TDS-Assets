import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "./provider";
import { logAiConversation } from "./log";
import {
  getFleetSummary,
  getAssetsByLocation,
  getWarrantyExpiring,
  getRecentAlerts,
} from "@/lib/queries";

function ruleBasedSummary(data: Awaited<ReturnType<typeof buildReportContext>>): string {
  const { fleet, byLocation, warrantyExpiring, openAlerts } = data;
  const visibility = fleet.total ? Math.round((fleet.active / fleet.total) * 100) : 0;
  const topSite = byLocation[0];

  const parts = [
    `Asset visibility is currently ${visibility}%, with ${fleet.active} of ${fleet.total} assets active.`,
    fleet.missing > 0
      ? `${fleet.missing} asset${fleet.missing === 1 ? " is" : "s are"} currently marked missing.`
      : `No assets are currently marked missing.`,
    warrantyExpiring.length > 0
      ? `${warrantyExpiring.length} warrant${warrantyExpiring.length === 1 ? "y expires" : "ies expire"} within 60 days.`
      : `No warranties expire within the next 60 days.`,
    topSite ? `${topSite.name} holds the largest share of the estate with ${topSite.count} assets.` : "",
    `There ${openAlerts === 1 ? "is" : "are"} currently ${openAlerts} open alert${openAlerts === 1 ? "" : "s"} awaiting action.`,
  ];

  return parts.filter(Boolean).join(" ");
}

async function buildReportContext(supabase: SupabaseClient, tenantId: string) {
  const [fleet, byLocation, warrantyExpiring, alerts] = await Promise.all([
    getFleetSummary(supabase, tenantId),
    getAssetsByLocation(supabase, tenantId),
    getWarrantyExpiring(supabase, tenantId, 60),
    getRecentAlerts(supabase, tenantId, 50),
  ]);

  return {
    fleet,
    byLocation,
    warrantyExpiring,
    openAlerts: alerts.filter((a) => a.status === "open").length,
  };
}

export async function generateReportSummary(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string }
): Promise<string> {
  const context = await buildReportContext(supabase, params.tenantId);
  const provider = getAIProvider();

  let summary: string;
  let providerName = provider?.name ?? "rule_based";
  if (provider) {
    try {
      summary = await provider.generateText({
        system:
          "You write a short management summary from asset operations data, in the tone of a monthly ops report. 3-4 sentences, plain business language, no markdown, use only the figures given.",
        prompt: JSON.stringify(context),
      });
    } catch (err) {
      console.error("AI provider failed, falling back to rule-based summary:", err);
      summary = ruleBasedSummary(context);
      providerName = "rule_based";
    }
  } else {
    summary = ruleBasedSummary(context);
  }

  await logAiConversation(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    context: "report",
    provider: providerName,
    prompt: "generate report summary",
    response: summary,
  });

  return summary;
}
