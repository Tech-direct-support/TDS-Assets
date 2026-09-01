import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/database";

export interface Session {
  userId: string;
  email: string;
  profile: UserProfile;
}

/** Loads the signed-in user's profile (tenant + role). Redirects to /login if absent. */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { userId: user.id, email: user.email ?? "", profile: profile as UserProfile };
}

export function canManageAssets(role: UserProfile["role"]) {
  return role === "admin" || role === "asset_manager";
}

export function canManageHelpdesk(role: UserProfile["role"]) {
  return role === "admin" || role === "operator";
}

export function isAdmin(role: UserProfile["role"]) {
  return role === "admin";
}
