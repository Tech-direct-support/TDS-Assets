import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetForm } from "@/components/assets/AssetForm";
import type { Asset } from "@/lib/types/database";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [{ data: asset }, { data: categories }, { data: locations }, { data: users }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", id).single(),
    supabase.from("asset_categories").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("locations").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("user_profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
  ]);

  if (!asset) notFound();

  return (
    <div className="pb-10">
      <PageHeader title={`Edit — ${asset.name}`} description={asset.asset_tag} />
      <div className="px-4 md:px-6">
        <AssetForm
          mode="edit"
          asset={asset as Asset}
          categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          locations={(locations ?? []).map((l) => ({ id: l.id, name: l.name }))}
          users={(users ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
        />
      </div>
    </div>
  );
}
