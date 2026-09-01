import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ExplainAlertButton } from "@/components/alerts/ExplainAlertButton";
import { AlertStatusControl } from "@/components/alerts/AlertStatusControl";
import { severityTone, titleCase } from "@/lib/badgeTones";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="text-[13px] text-ink mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: alert } = await supabase
    .from("alerts")
    .select("*, assets(id, asset_tag, name, status), locations(name), operator:user_profiles(full_name)")
    .eq("id", id)
    .eq("tenant_id", session.profile.tenant_id)
    .single();

  if (!alert) notFound();

  const asset = alert.assets as unknown as { id: string; asset_tag: string; name: string; status: string } | null;
  const location = alert.locations as unknown as { name: string } | null;
  const operator = alert.operator as unknown as { full_name: string } | null;

  return (
    <div className="pb-10">
      <PageHeader
        title={titleCase(alert.type)}
        description={alert.reason}
        actions={<AlertStatusControl alertId={alert.id} status={alert.status} />}
      />

      <div className="px-4 md:px-6 flex items-center gap-2 -mt-2 mb-4">
        <Badge tone={severityTone(alert.severity)}>{titleCase(alert.severity)} severity</Badge>
        <span className="text-[12px] text-ink-soft">
          Raised {new Date(alert.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>

      <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">AI explanation</h3>
          <ExplainAlertButton alertId={alert.id} />
        </Card>

        <Card>
          <h3 className="text-[13px] font-semibold text-ink mb-3">Details</h3>
          <div className="space-y-3">
            <Detail label="Asset" value={asset ? <Link href={`/assets/${asset.id}`} className="text-red hover:underline">{asset.name} ({asset.asset_tag})</Link> : "—"} />
            <Detail label="Location" value={location?.name} />
            <Detail label="Assigned operator" value={operator?.full_name ?? "Unassigned"} />
            <Detail label="Resolved at" value={alert.resolved_at ? new Date(alert.resolved_at).toLocaleString("en-AU") : undefined} />
          </div>
        </Card>
      </div>
    </div>
  );
}
