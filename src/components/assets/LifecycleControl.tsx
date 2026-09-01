"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionAssetStatus } from "@/lib/actions/assets";
import { nextStates, ASSET_STATUS_LABELS } from "@/lib/lifecycle";
import { Button } from "@/components/ui/Button";
import type { AssetStatus } from "@/lib/types/database";

export function LifecycleControl({ assetId, status }: { assetId: string; status: AssetStatus }) {
  const router = useRouter();
  const options = nextStates(status);
  const [target, setTarget] = useState<AssetStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (options.length === 0) {
    return <p className="text-[12px] text-ink-soft">No further transitions available from this status.</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!target) return;
        setSaving(true);
        setError(null);
        const res = await transitionAssetStatus(assetId, target, note || undefined);
        setSaving(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        setTarget("");
        setNote("");
        router.refresh();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <label className="block text-[11px] font-medium text-ink-soft mb-1">Move to</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as AssetStatus)}
          className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
        >
          <option value="">Select status</option>
          {options.map((s) => (
            <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-[11px] font-medium text-ink-soft mb-1">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px]"
        />
      </div>
      <Button type="submit" variant="dark" disabled={!target || saving}>
        {saving ? "Updating..." : "Update Status"}
      </Button>
      {error && <p className="text-[11px] text-red w-full">{error}</p>}
    </form>
  );
}
