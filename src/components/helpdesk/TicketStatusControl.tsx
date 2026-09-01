"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTicketStatus } from "@/lib/actions/helpdesk";
import type { TicketStatus } from "@/lib/types/database";

const STATUSES: TicketStatus[] = ["open", "in_progress", "waiting", "resolved", "closed"];

export function TicketStatusControl({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  return (
    <select
      value={current}
      disabled={saving}
      onChange={async (e) => {
        const next = e.target.value as TicketStatus;
        setCurrent(next);
        setSaving(true);
        await updateTicketStatus(ticketId, next);
        setSaving(false);
        router.refresh();
      }}
      className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white capitalize"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s.replace("_", " ")}</option>
      ))}
    </select>
  );
}
