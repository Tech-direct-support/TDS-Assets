import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, isAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { RoleSelect } from "@/components/settings/RoleSelect";
import { titleCase } from "@/lib/badgeTones";

export default async function UsersSettingsPage() {
  const session = await requireSession();
  if (!isAdmin(session.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("tenant_id", session.profile.tenant_id)
    .order("full_name");

  return (
    <div className="pb-10">
      <PageHeader title="Users" description="Team members with access to this workspace." actions={<InviteUserDialog />} />

      <div className="px-4 md:px-6">
        <div className="bg-white border border-line rounded-[3px] overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-black text-white">
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Email</th>
                <th className="text-left font-medium px-3 py-2.5">Department</th>
                <th className="text-left font-medium px-3 py-2.5">Role</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u, i) => (
                <tr key={u.id} className={`border-t border-line ${i % 2 === 1 ? "bg-surface-muted" : "bg-white"}`}>
                  <td className="px-3 py-2.5 text-ink">{u.full_name}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{u.email}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{u.department ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {u.id === session.userId ? (
                      <span className="text-ink-soft">{titleCase(u.role)} (you)</span>
                    ) : (
                      <RoleSelect userId={u.id} role={u.role} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
