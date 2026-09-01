import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetForm } from "@/components/assets/AssetForm";

export default async function NewAssetPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const tenantId = session.profile.tenant_id;

  const [{ data: categories }, { data: locations }, { data: users }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("locations").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("user_profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
  ]);

  return (
    <div className="pb-10">
      <PageHeader title="Add Asset" description="Register a new asset into the platform." />
      <div className="px-4 md:px-6">
        <AssetForm
          mode="create"
          categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          locations={(locations ?? []).map((l) => ({ id: l.id, name: l.name }))}
          users={(users ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
        />
      </div>
    </div>
  );
}
