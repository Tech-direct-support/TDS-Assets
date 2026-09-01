import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "./provider";
import { logAiConversation } from "./log";
import { ASSET_STATUS_LABELS } from "@/lib/lifecycle";

const ASSET_TAG_RE = /\b[A-Z]{2,5}-\d{2,6}\b/i;

async function buildSnapshot(supabase: SupabaseClient, tenantId: string) {
  const [{ data: assets }, { data: alerts }] = await Promise.all([
    supabase
      .from("assets")
      .select("asset_tag, name, status, category_id, warranty_expiry, current_location_id, assigned_to, asset_categories(name), locations(name), user_profiles(full_name)")
      .eq("tenant_id", tenantId)
      .eq("archived", false),
    supabase
      .from("alerts")
      .select("id, type, severity, reason, status, created_at, assets(asset_tag, name), locations(name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return { assets: assets ?? [], alerts: alerts ?? [] };
}

type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;

function relName(rel: unknown): string | null {
  if (!rel) return null;
  const r = Array.isArray(rel) ? rel[0] : rel;
  return (r as { name?: string; full_name?: string })?.name ?? (r as { full_name?: string })?.full_name ?? null;
}

function ruleBasedAnswer(question: string, snap: Snapshot): string {
  const q = question.toLowerCase();

  const tagMatch = question.match(ASSET_TAG_RE);
  if (tagMatch) {
    const asset = snap.assets.find((a) => a.asset_tag.toLowerCase() === tagMatch[0].toLowerCase());
    if (asset) {
      const person = relName(asset.user_profiles);
      const loc = relName(asset.locations);
      if (q.includes("responsible") || q.includes("who")) {
        return person
          ? `${asset.asset_tag} (${asset.name}) is assigned to ${person}.`
          : `${asset.asset_tag} (${asset.name}) is not currently assigned to anyone.`;
      }
      return `${asset.asset_tag} — ${asset.name}: status ${ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS]}, last known at ${loc ?? "an unrecorded location"}, assigned to ${person ?? "no one"}.`;
    }
  }

  if (q.includes("missing")) {
    const missing = snap.assets.filter((a) => a.status === "missing");
    if (missing.length === 0) return "No assets are currently marked as missing.";
    const list = missing.slice(0, 10).map((a) => `${a.asset_tag} (${a.name})`).join(", ");
    return `${missing.length} asset${missing.length === 1 ? " is" : "s are"} currently missing: ${list}.`;
  }

  if (q.includes("warranty")) {
    const daysMatch = q.match(/(\d+)\s*day/);
    const days = daysMatch ? Number(daysMatch[1]) : 30;
    const today = new Date();
    const horizon = new Date(today.getTime() + days * 86400000);
    const expiring = snap.assets.filter(
      (a) => a.warranty_expiry && a.warranty_expiry >= today.toISOString().slice(0, 10) && a.warranty_expiry <= horizon.toISOString().slice(0, 10)
    );
    if (expiring.length === 0) return `No assets have a warranty expiring in the next ${days} days.`;
    const list = expiring.slice(0, 10).map((a) => `${a.asset_tag} (${a.warranty_expiry})`).join(", ");
    return `${expiring.length} asset${expiring.length === 1 ? "" : "s"} have a warranty expiring within ${days} days: ${list}.`;
  }

  if (q.includes("geofence") || q.includes("breach")) {
    const breaches = snap.alerts.filter((a) => a.type === "geofence_breach");
    if (breaches.length === 0) return "There are no recent geofence breaches.";
    const list = breaches
      .slice(0, 5)
      .map((a) => `${relName(a.assets) ?? "an asset"} at ${relName(a.locations) ?? "an unknown site"} (${new Date(a.created_at).toLocaleString("en-AU")})`)
      .join("; ");
    return `Recent geofence breaches: ${list}.`;
  }

  if (q.includes("site") && (q.includes("alert") || q.includes("most"))) {
    const bySite = new Map<string, number>();
    for (const a of snap.alerts) {
      const name = relName(a.locations) ?? "Unknown site";
      bySite.set(name, (bySite.get(name) ?? 0) + 1);
    }
    const sorted = Array.from(bySite, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return "There are no alerts recorded yet.";
    return `${sorted[0].name} has generated the most alerts recently, with ${sorted[0].count} in the current window.`;
  }

  const categoryWords = ["laptop", "phone", "projector", "monitor", "vehicle", "tablet", "desktop"];
  const statusWords = Object.entries(ASSET_STATUS_LABELS);
  const matchedCategory = categoryWords.find((c) => q.includes(c));
  const matchedStatus = statusWords.find(([, label]) => q.includes(label.toLowerCase()));
  if (matchedCategory || matchedStatus) {
    const filtered = snap.assets.filter((a) => {
      const catName = (relName(a.asset_categories) ?? "").toLowerCase();
      const okCategory = matchedCategory ? catName.includes(matchedCategory) : true;
      const okStatus = matchedStatus ? a.status === matchedStatus[0] : true;
      return okCategory && okStatus;
    });
    const subject = [matchedCategory, matchedStatus?.[1].toLowerCase()].filter(Boolean).join(" in ");
    return `There ${filtered.length === 1 ? "is" : "are"} ${filtered.length} ${subject || "matching"} asset${filtered.length === 1 ? "" : "s"}.`;
  }

  const total = snap.assets.length;
  const openAlerts = snap.alerts.filter((a) => a.status === "open").length;
  return `The estate currently holds ${total} assets with ${openAlerts} open alerts. Try asking about missing assets, warranty expiry, geofence breaches, alerts by site, or a specific asset tag.`;
}

export async function askAssetAssistant(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; question: string }
): Promise<string> {
  const snapshot = await buildSnapshot(supabase, params.tenantId);
  const provider = getAIProvider();

  let answer: string;
  let providerName = provider?.name ?? "rule_based";
  if (provider) {
    try {
      answer = await provider.generateText({
        system:
          "You are the TDS Asset Intelligence Platform assistant. Answer strictly using the JSON asset data provided — never invent assets, figures, or people. Reply in 2-4 short, plain-language business sentences, no markdown.",
        prompt: `ASSET AND ALERT DATA:\n${JSON.stringify(snapshot).slice(0, 12000)}\n\nQUESTION: ${params.question}`,
      });
    } catch (err) {
      console.error("AI provider failed, falling back to rule-based answer:", err);
      answer = ruleBasedAnswer(params.question, snapshot);
      providerName = "rule_based";
    }
  } else {
    answer = ruleBasedAnswer(params.question, snapshot);
  }

  await logAiConversation(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    context: "assistant",
    provider: providerName,
    prompt: params.question,
    response: answer,
  });

  return answer;
}
