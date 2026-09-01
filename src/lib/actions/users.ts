"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireSession, isAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/types/database";

export async function inviteUser(email: string, fullName: string, role: UserRole) {
  const session = await requireSession();
  if (!isAdmin(session.profile.role)) return { error: "Only admins can invite users." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) return { error: error.message };

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: data.user.id,
    tenant_id: session.profile.tenant_id,
    full_name: fullName,
    email,
    role,
  });
  if (profileError) return { error: profileError.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "user",
    entityId: data.user.id,
    action: "invited",
    actorId: session.userId,
    after: { email, role },
  });

  revalidatePath("/settings/users");
  return { data: true };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const session = await requireSession();
  if (!isAdmin(session.profile.role)) return { error: "Only admins can change roles." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "user",
    entityId: userId,
    action: "role_changed",
    actorId: session.userId,
    after: { role },
  });

  revalidatePath("/settings/users");
  return { data: true };
}
