import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: tenant }, { count: openAlerts }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", session.profile.tenant_id).single(),
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", session.profile.tenant_id)
      .eq("status", "open"),
  ]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-surface-muted">
      <Sidebar role={session.profile.role} openAlerts={openAlerts ?? 0} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          tenantName={tenant?.name ?? "TDS Asset Intelligence"}
          fullName={session.profile.full_name}
          role={session.profile.role}
          openAlerts={openAlerts ?? 0}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <AssistantPanel />
    </div>
  );
}
