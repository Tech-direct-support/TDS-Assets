"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAlertStatus } from "@/lib/actions/alerts";
import type { AlertStatus } from "@/lib/types/database";

const STATUSES: AlertStatus[] = ["open", "acknowledged", "investigating", "resolved"];

export function AlertStatusControl({ alertId, status }: { alertId: string; status: AlertStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        disabled={saving}
        onChange={async (e) => {
          const next = e.target.value as AlertStatus;
          setCurrent(next);
          setSaving(true);
          await updateAlertStatus(alertId, next);
          setSaving(false);
          router.refresh();
        }}
        className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
