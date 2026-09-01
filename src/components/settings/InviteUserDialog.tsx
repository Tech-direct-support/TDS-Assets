"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { inviteUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { UserRole } from "@/lib/types/database";

const inputClass = "w-full h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black";

export function InviteUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <UserPlus size={14} /> Invite User
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite User">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError(null);
            const fd = new FormData(e.currentTarget);
            const res = await inviteUser(
              String(fd.get("email")),
              String(fd.get("full_name")),
              fd.get("role") as UserRole
            );
            setSaving(false);
            if (res.error) {
              setError(res.error);
              return;
            }
            setOpen(false);
            router.refresh();
          }}
          className="space-y-3"
        >
          {error && <p className="text-[12px] text-red">{error}</p>}
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Full Name</label>
            <input name="full_name" required className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Email</label>
            <input name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Role</label>
            <select name="role" defaultValue="viewer" className={inputClass}>
              <option value="admin">Admin</option>
              <option value="asset_manager">Asset Manager</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? "Sending invite..." : "Send Invite"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
