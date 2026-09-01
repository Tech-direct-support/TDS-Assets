"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createLocation } from "@/lib/actions/locations";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const inputClass = "w-full h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black";

export function NewLocationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add Location
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Location">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError(null);
            const fd = new FormData(e.currentTarget);
            const res = await createLocation({
              name: String(fd.get("name")),
              address: (fd.get("address") as string) || null,
              contact_name: (fd.get("contact_name") as string) || null,
              contact_phone: (fd.get("contact_phone") as string) || null,
              lat: Number(fd.get("lat")),
              lng: Number(fd.get("lng")),
            });
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
            <label className="block text-[12px] font-medium text-ink mb-1">Name</label>
            <input name="name" required className={inputClass} placeholder="Sydney HQ" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1">Address</label>
            <input name="address" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Contact Name</label>
              <input name="contact_name" className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Contact Phone</label>
              <input name="contact_phone" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Latitude</label>
              <input name="lat" type="number" step="0.000001" required className={inputClass} placeholder="-33.8688" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink mb-1">Longitude</label>
              <input name="lng" type="number" step="0.000001" required className={inputClass} placeholder="151.2093" />
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? "Saving..." : "Add Location"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
