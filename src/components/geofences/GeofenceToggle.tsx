"use client";

import { useState, useTransition } from "react";
import { toggleGeofence } from "@/lib/actions/geofences";

export function GeofenceToggle({
  geofenceId,
  enabled,
}: {
  geofenceId: string;
  enabled: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setOn(next);

        startTransition(() => {
          toggleGeofence(geofenceId, next);
        });
      }}
      className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        on ? "bg-red" : "bg-line-strong"
      }`}
      aria-label="Toggle geofence"
      aria-pressed={on}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}