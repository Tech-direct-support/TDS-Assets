import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAiConversation(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string | null;
    context: "assistant" | "helpdesk" | "alert" | "report";
    provider: string;
    prompt: string;
    response: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("ai_conversations").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    context: params.context,
    provider: params.provider,
    prompt: params.prompt,
    response: params.response,
    metadata: params.metadata ?? {},
  });
}
