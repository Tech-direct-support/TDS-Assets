"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadAssetPhoto, removeAssetPhoto } from "@/lib/actions/assets";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AssetPhotoCard({
  assetId,
  photoUrl,
  canManage,
}: {
  assetId: string;
  photoUrl: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await uploadAssetPhoto(assetId, fd);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <h3 className="text-[13px] font-semibold text-ink mb-3">Photo</h3>
      {error && <p className="text-[12px] text-red mb-2">{error}</p>}

      {photoUrl ? (
        <div className="space-y-2">
          <img src={photoUrl} alt="Asset" className="w-full aspect-video object-cover rounded-[3px] border border-line" />
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                <ImagePlus size={13} /> Replace
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Remove this photo?")) return;
                  setBusy(true);
                  await removeAssetPhoto(assetId);
                  setBusy(false);
                  router.refresh();
                }}
              >
                <Trash2 size={13} /> Remove
              </Button>
            </div>
          )}
        </div>
      ) : canManage ? (
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} className="w-full">
          <ImagePlus size={14} /> {busy ? "Uploading..." : "Upload photo"}
        </Button>
      ) : (
        <p className="text-[12px] text-ink-soft">No photo uploaded.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </Card>
  );
}
