"use client";

import dynamic from "next/dynamic";
import type { MapAsset, MapGeofence } from "@/components/map/MapView";

const MapView = dynamic(() => import("@/components/map/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-[13px] text-ink-soft">
      Loading map...
    </div>
  ),
});

export function MapClientLoader(props: { assets: MapAsset[]; geofences: MapGeofence[]; center: [number, number] }) {
  return <MapView {...props} />;
}
