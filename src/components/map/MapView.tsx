"use client";

import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Radar, X } from "lucide-react";
import { simulateAssetMove } from "@/lib/actions/assets";
import type { AssetStatus, GeofenceShape } from "@/lib/types/database";

export interface MapAsset {
  id: string;
  asset_tag: string;
  name: string;
  status: AssetStatus;
  lat: number;
  lng: number;
  assignedTo: string | null;
  locationName: string | null;
  hasOpenAlert: boolean;
}

export interface MapGeofence {
  id: string;
  name: string;
  shape_type: "circle" | "polygon";
  shape: GeofenceShape;
  enabled: boolean;
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px ${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const NORMAL_ICON = markerIcon("#0A0A0A");
const CRITICAL_ICON = markerIcon("#D6001C");

function statusIcon(asset: MapAsset) {
  return asset.hasOpenAlert || asset.status === "missing" ? CRITICAL_ICON : NORMAL_ICON;
}

function ClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapView({
  assets,
  geofences,
  center,
}: {
  assets: MapAsset[];
  geofences: MapGeofence[];
  center: [number, number];
}) {
  const [simMode, setSimMode] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [toast, setToast] = useState<{ breached: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [localAssets, setLocalAssets] = useState(assets);

  const selectedAsset = localAssets.find((a) => a.id === selectedAssetId);

  async function handleMapClick(lat: number, lng: number) {
    if (!simMode || !selectedAssetId || busy) return;
    setBusy(true);
    const res = await simulateAssetMove(selectedAssetId, lat, lng);
    setBusy(false);
    if (res.error) {
      setToast({ breached: false, text: res.error });
      return;
    }
    setLocalAssets((prev) => prev.map((a) => (a.id === selectedAssetId ? { ...a, lat, lng } : a)));
    if (res.data?.breached) {
      setToast({ breached: true, text: `GEOFENCE BREACH — left "${res.data.geofenceName}"` });
    } else {
      setToast({ breached: false, text: "Position updated." });
    }
  }

  const geofenceEls = useMemo(
    () =>
      geofences
        .filter((g) => g.enabled)
        .map((g) =>
          "radius_m" in g.shape ? (
            <Circle
              key={g.id}
              center={g.shape.center}
              radius={g.shape.radius_m}
              pathOptions={{ color: "#0A0A0A", weight: 2, dashArray: "6 5", fillOpacity: 0.04 }}
            />
          ) : (
            <Polygon
              key={g.id}
              positions={g.shape.points}
              pathOptions={{ color: "#0A0A0A", weight: 2, dashArray: "6 5", fillOpacity: 0.04 }}
            />
          )
        ),
    [geofences]
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-3 left-3 z-[1000] bg-white border border-line rounded-[3px] shadow-sm px-3 py-2.5 w-[280px]">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-ink flex items-center gap-1.5">
            <Radar size={14} className={simMode ? "text-red" : "text-ink-soft"} /> Simulation Mode
          </span>
 <button
  type="button"
  onClick={() => {
    setSimMode((v) => !v);
    setToast(null);
  }}
  className={`relative flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
    simMode ? "bg-red" : "bg-line-strong"
  }`}
  aria-label="Toggle simulation mode"
  aria-pressed={simMode}
>
  <span
    className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
      simMode ? "translate-x-4" : "translate-x-0"
    }`}
  />
</button>
        </div>
        {simMode && (
          <div className="mt-2.5">
            <label className="block text-[11px] text-ink-soft mb-1">Select an asset, then click the map</label>
            <select
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                setToast(null);
              }}
              className="w-full h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px]"
            >
              <option value="">Choose asset...</option>
              {localAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>
              ))}
            </select>
            {selectedAsset && (
              <p className="text-[11px] text-ink-soft mt-1.5">
                Click anywhere on the map to report a new position for {selectedAsset.asset_tag}.
              </p>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`absolute top-3 right-3 z-[1000] max-w-[320px] px-3.5 py-3 rounded-[3px] border shadow-sm flex items-start gap-2 ${
            toast.breached ? "bg-red text-white border-red" : "bg-black text-white border-black"
          }`}
        >
          <span className="text-[12.5px] font-medium flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onClick={handleMapClick} />
        {geofenceEls}
        {localAssets.map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={statusIcon(a)}>
            <Popup>
              <div className="text-[12.5px] min-w-[160px]">
                <div className="font-semibold text-black">{a.name}</div>
                <div className="text-[11px] text-neutral-500 font-mono mb-1.5">{a.asset_tag}</div>
                <div>Status: <strong>{a.status.replace(/_/g, " ")}</strong></div>
                <div>Assigned: {a.assignedTo ?? "Unassigned"}</div>
                <div>Location: {a.locationName ?? "—"}</div>
                <Link href={`/assets/${a.id}`} className="text-red font-medium block mt-1.5">
                  View asset →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
