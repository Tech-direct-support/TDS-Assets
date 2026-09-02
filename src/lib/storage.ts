import type { SupabaseClient } from "@supabase/supabase-js";

export const ASSET_PHOTOS_BUCKET = "asset-photos";
export const TICKET_ATTACHMENTS_BUCKET = "ticket-attachments";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Buckets are private, so every read goes through a short-lived signed URL. */
export async function getSignedUrl(supabase: SupabaseClient, bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getSignedUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return {};

  const map: Record<string, string> = {};
  data.forEach((entry, i) => {
    if (entry.signedUrl) map[paths[i]] = entry.signedUrl;
  });
  return map;
}
