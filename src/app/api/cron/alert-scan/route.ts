import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanTenantAlerts } from "@/lib/alertScan";

/**
 * Scheduled alert scan across every tenant — the automated counterpart to
 * the admin "Run Alert Scan" button. Configured as a Vercel Cron Job in
 * vercel.json; Vercel signs its own requests with CRON_SECRET as a bearer
 * token, so this route rejects anything else. Safe to call repeatedly:
 * scanTenantAlerts() only raises an alert if there isn't already an open
 * one of that type for the asset.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tenants, error } = await supabase.from("tenants").select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let totalCreated = 0;
  for (const tenant of tenants ?? []) {
    totalCreated += await scanTenantAlerts(supabase, tenant.id);
  }

  return NextResponse.json({ tenantsScanned: tenants?.length ?? 0, alertsCreated: totalCreated });
}
