"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "@/lib/actions/users";
import type { UserRole } from "@/lib/types/database";

export function RoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const router = useRouter();
  const [current, setCurrent] = useState(role);
  const [saving, setSaving] = useState(false);

  return (
    <select
      value={current}
      disabled={saving}
      onChange={async (e) => {
        const next = e.target.value as UserRole;
        setCurrent(next);
        setSaving(true);
        await updateUserRole(userId, next);
        setSaving(false);
        router.refresh();
      }}
      className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
    >
      <option value="admin">Admin</option>
      <option value="asset_manager">Asset Manager</option>
      <option value="operator">Operator</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
