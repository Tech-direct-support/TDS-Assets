"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireSession, isAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmailHtml } from "@/lib/email/templates";
import type { UserRole } from "@/lib/types/database";

/**
 * Generates the invite link via the admin API instead of
 * inviteUserByEmail() so delivery goes through Resend rather than
 * Supabase's shared mailer, which is rate-limited and not meant for
 * production traffic.
 */
export async function inviteUser(email: string, fullName: string, role: UserRole) {
  const session = await requireSession();
  if (!isAdmin(session.profile.role)) return { error: "Only admins can invite users." };

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  if (linkError) return { error: linkError.message };

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: link.user.id,
    tenant_id: session.profile.tenant_id,
    full_name: fullName,
    email,
    role,
  });
  if (profileError) return { error: profileError.message };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", session.profile.tenant_id)
    .single();

  const { error: emailError } = await sendEmail({
    to: email,
    subject: `You're invited to ${tenant?.name ?? "TDS Asset Intelligence"}`,
    html: inviteEmailHtml({
      inviteLink: link.properties.action_link,
      tenantName: tenant?.name ?? "TDS Asset Intelligence",
      inviterName: session.profile.full_name,
    }),
  });

  await logAudit(supabase, {
    tenantId: session.profile.tenant_id,
    entityType: "user",
    entityId: link.user.id,
    action: "invited",
    actorId: session.userId,
    after: { email, role, email_sent: !emailError },
  });

  revalidatePath("/settings/users");
  if (emailError) return { data: true, warning: `User was created, but the invite email failed to send: ${emailError}` };
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
