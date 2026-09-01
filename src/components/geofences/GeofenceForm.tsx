"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createGeofence } from "@/lib/actions/geofences";
import { Button } from "@/components/ui/Button";

interface LocationOption {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface AssetOption {
  id: string;
  asset_tag: string;
  name: string;
  home_location_id: string | null;
}

const inputClass = "w-full h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black";

export function GeofenceForm({ locations, assets }: { locations: LocationOption[]; assets: AssetOption[] }) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [radius, setRadius] = useState(200);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = locations.find((l) => l.id === locationId);
  const assetsAtLocation = useMemo(
    () => assets.filter((a) => a.home_location_id === locationId),
    [assets, locationId]
  );

  return (
    <form
      className="max-w-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!location) return;
        setSaving(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const res = await createGeofence({
          name: String(fd.get("name")),
          location_id: locationId,
          shape_type: "circle",
          shape: { center: [location.lat, location.lng], radius_m: radius },
          asset_ids: Array.from(selectedAssets),
        });
        setSaving(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        router.push("/geofences");
      }}
    >
      {error && <div className="mb-4 text-[12px] px-3 py-2 border border-red bg-red-tint text-red-dark rounded-[3px]">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Geofence Name</label>
          <input name="name" required className={inputClass} placeholder="Sydney HQ — approved zone" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Site</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[12px] font-medium text-ink mb-1.5">Boundary radius (metres from site centre)</label>
        <input
          type="range"
          min={50}
          max={2000}
          step={50}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-[12px] text-ink-soft mt-1">{radius} m</div>
      </div>

      <div className="mb-6">
        <label className="block text-[12px] font-medium text-ink mb-1.5">
          Assets this rule governs <span className="text-ink-soft font-normal">(leave empty to apply to every asset homed at this site)</span>
        </label>
        <div className="border border-line rounded-[3px] max-h-56 overflow-y-auto">
          {assetsAtLocation.length === 0 ? (
            <p className="text-[12px] text-ink-soft px-3 py-3">No assets are homed at this site yet.</p>
          ) : (
            assetsAtLocation.map((a) => (
              <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-[12.5px] border-b border-line last:border-0 hover:bg-surface-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAssets.has(a.id)}
                  onChange={(e) => {
                    setSelectedAssets((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      return next;
                    });
                  }}
                />
                <span className="font-mono text-[11.5px] text-ink-soft">{a.asset_tag}</span>
                <span className="text-ink">{a.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={saving || !location}>
          {saving ? "Creating..." : "Create Geofence"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
