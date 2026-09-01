import type { AssetStatus } from "@/lib/types/database";

/**
 * Allowed forward transitions per status. Transitions into "missing" are
 * meant to be system-raised from an unresolved geofence breach; transitions
 * out of "missing" require human adjudication (still routed through this
 * same table — the constraint lives in who is allowed to call it, not here).
 */
export const LIFECYCLE_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  ordered: ["received", "written_off"],
  received: ["in_stock", "written_off"],
  in_stock: ["assigned", "in_use", "disposal", "written_off"],
  assigned: ["in_use", "in_stock", "missing", "written_off"],
  in_use: ["maintenance", "in_transit", "missing", "returned", "written_off"],
  maintenance: ["in_use", "in_stock", "disposal", "written_off"],
  in_transit: ["in_use", "missing", "written_off"],
  missing: ["in_use", "in_stock", "written_off"],
  returned: ["in_stock", "disposal", "written_off"],
  disposal: ["written_off"],
  written_off: [],
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ordered: "Ordered",
  received: "Received",
  in_stock: "In Stock",
  assigned: "Assigned",
  in_use: "In Use",
  maintenance: "Maintenance",
  in_transit: "In Transit",
  missing: "Missing",
  returned: "Returned",
  disposal: "Disposal",
  written_off: "Written Off",
};

/** Canonical left-to-right ordering used for the lifecycle timeline UI. */
export const LIFECYCLE_ORDER: AssetStatus[] = [
  "ordered",
  "received",
  "in_stock",
  "assigned",
  "in_use",
  "maintenance",
  "returned",
  "disposal",
  "written_off",
];

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return false;
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: AssetStatus): AssetStatus[] {
  return LIFECYCLE_TRANSITIONS[from] ?? [];
}
