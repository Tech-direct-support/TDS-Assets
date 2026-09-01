import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "./provider";
import { logAiConversation } from "./log";

const ALERT_REASON_HINTS: Record<string, string> = {
  geofence_breach: "The asset's tracked position moved outside its approved zone boundary.",
  missing_asset: "The asset has not reported a valid location and has been marked missing.",
  warranty_expiry: "The asset's warranty coverage is due to lapse soon.",
  maintenance_due: "The asset is due for scheduled maintenance.",
  unassigned_asset: "The asset has no custodian currently assigned to it.",
  other: "An operational condition on this asset needs review.",
};

function ruleBasedExplanation(alert: Record<string, unknown>): string {
  const type = alert.type as string;
  const asset = alert.assets as { asset_tag?: string; name?: string } | null;
  const location = alert.locations as { name?: string } | null;
  const when = new Date(alert.created_at as string).toLocaleString("en-AU");
  const hint = ALERT_REASON_HINTS[type] ?? ALERT_REASON_HINTS.other;

  const subject = asset ? `${asset.name} (${asset.asset_tag})` : "This asset";
  const where = location?.name ? ` at ${location.name}` : "";

  const nextStep =
    type === "geofence_breach"
      ? "Confirm whether the movement was authorised, and contact the custodian if not."
      : type === "missing_asset"
      ? "Check the last known location and recent activity, then escalate to the asset administrator."
      : type === "warranty_expiry"
      ? "Decide whether to renew cover or plan for replacement before the expiry date."
      : type === "maintenance_due"
      ? "Schedule the asset for service to avoid unplanned downtime."
      : type === "unassigned_asset"
      ? "Assign a custodian so the asset has clear accountability."
      : "Review the alert details and assign an operator if action is required.";

  return `${subject}${where} triggered a ${(alert.severity as string)} ${type.replace(/_/g, " ")} alert at ${when}. ${hint} Recommended next step: ${nextStep}`;
}

export async function explainAlert(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; alertId: string }
): Promise<string> {
  const { data: alert } = await supabase
    .from("alerts")
    .select("*, assets(asset_tag, name, status), locations(name)")
    .eq("id", params.alertId)
    .single();

  if (!alert) return "Alert not found.";

  const provider = getAIProvider();
  let explanation: string;
  let providerName = provider?.name ?? "rule_based";

  if (provider) {
    try {
      explanation = await provider.generateText({
        system:
          "Explain this operational alert in two short, plain business-language sentences: what happened, then a recommended next step. No jargon, no markdown.",
        prompt: JSON.stringify(alert),
      });
    } catch (err) {
      console.error("AI provider failed, falling back to rule-based explanation:", err);
      explanation = ruleBasedExplanation(alert as Record<string, unknown>);
      providerName = "rule_based";
    }
  } else {
    explanation = ruleBasedExplanation(alert as Record<string, unknown>);
  }

  await logAiConversation(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    context: "alert",
    provider: providerName,
    prompt: `explain alert ${params.alertId}`,
    response: explanation,
  });

  return explanation;
}
