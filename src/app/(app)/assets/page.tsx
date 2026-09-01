import Link from "next/link";
import { Plus, Upload, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession, canManageAssets } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { AssetFilters } from "@/components/assets/AssetFilters";
import { assetStatusTone, assetStatusLabel } from "@/lib/badgeTones";
import type { AssetStatus } from "@/lib/types/database";

const PAGE_SIZE = 25;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const q = sp.q ?? "";
  const category = sp.category ?? "";
  const status = sp.status ?? "";
  const location = sp.location ?? "";
  const assigned = sp.assigned ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [{ data: categories }, { data: locations }, { data: users }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("locations").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("user_profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
  ]);

  let query = supabase
    .from("assets")
    .select(
      "id, asset_tag, name, serial_number, status, last_seen_at, warranty_expiry, asset_categories(name), locations!assets_current_location_id_fkey(name), user_profiles(full_name)",
      { count: "exact" }
    )
    .eq("tenant_id", tenantId)
    .eq("archived", false);

  if (q) query = query.or(`name.ilike.%${q}%,asset_tag.ilike.%${q}%,serial_number.ilike.%${q}%`);
  if (category) query = query.eq("category_id", category);
  if (status) query = query.eq("status", status as AssetStatus);
  if (location) query = query.eq("current_location_id", location);
  if (assigned === "unassigned") query = query.is("assigned_to", null);
  else if (assigned) query = query.eq("assigned_to", assigned);

  const { data: assets, count } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const assetIds = (assets ?? []).map((a) => a.id);
  const { data: openAlertAssets } =
    assetIds.length > 0
      ? await supabase.from("alerts").select("asset_id").eq("status", "open").in("asset_id", assetIds)
      : { data: [] };
  const atRisk = new Set((openAlertAssets ?? []).map((a) => a.asset_id));

  const canManage = canManageAssets(session.profile.role);

  return (
    <div className="pb-10">
      <PageHeader
        title="Asset Register"
        description="Every asset your business owns, with custody, location, and lifecycle status."
        actions={
          canManage ? (
            <>
              <LinkButton href="/assets/import" variant="outline">
                <Upload size={14} /> Import CSV
              </LinkButton>
              <LinkButton href="/assets/new" variant="primary">
                <Plus size={14} /> Add Asset
              </LinkButton>
            </>
          ) : undefined
        }
      />

      <div className="px-4 md:px-6">
        <AssetFilters
          categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          locations={(locations ?? []).map((l) => ({ id: l.id, name: l.name }))}
          users={(users ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
          initial={{ q, category, status, location, assigned }}
        />
      </div>

      <div className="px-4 md:px-6 mt-3">
        <div className="bg-white border border-line rounded-[3px] overflow-hidden">
          {!assets || assets.length === 0 ? (
            <EmptyState
              title="No assets found"
              description="Try adjusting your filters, or add your first asset."
              action={
                canManage ? (
                  <LinkButton href="/assets/new" variant="primary">
                    <Plus size={14} /> Add Asset
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="text-left font-medium px-3 py-2.5">Asset ID</th>
                      <th className="text-left font-medium px-3 py-2.5">Name</th>
                      <th className="text-left font-medium px-3 py-2.5">Type</th>
                      <th className="text-left font-medium px-3 py-2.5">Serial</th>
                      <th className="text-left font-medium px-3 py-2.5">Assigned To</th>
                      <th className="text-left font-medium px-3 py-2.5">Location</th>
                      <th className="text-left font-medium px-3 py-2.5">Status</th>
                      <th className="text-left font-medium px-3 py-2.5">Last Seen</th>
                      <th className="text-left font-medium px-3 py-2.5">Warranty</th>
                      <th className="text-left font-medium px-3 py-2.5">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => {
                      const category = a.asset_categories as unknown as { name: string } | { name: string }[] | null;
                      const loc = a.locations as unknown as { name: string } | { name: string }[] | null;
                      const person = a.user_profiles as unknown as { full_name: string } | { full_name: string }[] | null;
                      const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
                      const locName = Array.isArray(loc) ? loc[0]?.name : loc?.name;
                      const personName = Array.isArray(person) ? person[0]?.full_name : person?.full_name;

                      return (
                        <tr
                          key={a.id}
                          className={`border-t border-line ${i % 2 === 1 ? "bg-surface-muted" : "bg-white"} hover:bg-red-tint/40`}
                        >
                          <td className="px-3 py-2.5">
                            <Link href={`/assets/${a.id}`} className="font-medium text-ink hover:text-red font-mono text-[12px]">
                              {a.asset_tag}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-ink">{a.name}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{categoryName ?? "—"}</td>
                          <td className="px-3 py-2.5 text-ink-soft font-mono text-[11.5px]">{a.serial_number ?? "—"}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{personName ?? "Unassigned"}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{locName ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <Badge tone={assetStatusTone(a.status)}>{assetStatusLabel(a.status)}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-ink-soft">
                            {a.last_seen_at
                              ? new Date(a.last_seen_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-ink-soft">{a.warranty_expiry ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            {atRisk.has(a.id) && (
                              <span className="inline-flex items-center gap-1 text-red text-[11px] font-medium">
                                <TriangleAlert size={12} /> Alert
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={count ?? 0}
                basePath="/assets"
                searchParams={{ q, category, status, location, assigned }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
