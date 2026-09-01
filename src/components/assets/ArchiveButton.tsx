"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { archiveAsset } from "@/lib/actions/assets";
import { Button } from "@/components/ui/Button";

export function ArchiveButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Archive this asset? It will be hidden from the active register.")) return;
        setBusy(true);
        await archiveAsset(assetId);
        router.push("/assets");
      }}
    >
      <Archive size={14} /> {busy ? "Archiving..." : "Archive"}
    </Button>
  );
}
