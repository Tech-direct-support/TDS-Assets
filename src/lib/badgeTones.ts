import type { BadgeTone } from "@/components/ui/Badge";
import { ASSET_STATUS_LABELS } from "@/lib/lifecycle";
import type {
  AssetStatus,
  AlertSeverity,
  AlertStatus,
  TicketPriority,
  TicketStatus,
} from "@/lib/types/database";

export function assetStatusTone(status: AssetStatus): BadgeTone {
  if (status === "missing") return "critical";
  if (status === "written_off" || status === "disposal") return "muted";
  if (status === "maintenance" || status === "in_transit") return "dark";
  return "neutral";
}

export function assetStatusLabel(status: AssetStatus): string {
  return ASSET_STATUS_LABELS[status];
}

export function severityTone(severity: AlertSeverity): BadgeTone {
  if (severity === "critical") return "critical";
  if (severity === "high") return "attention";
  if (severity === "medium") return "dark";
  return "neutral";
}

export function alertStatusTone(status: AlertStatus): BadgeTone {
  if (status === "open") return "attention";
  if (status === "resolved") return "muted";
  return "dark";
}

export function ticketPriorityTone(priority: TicketPriority): BadgeTone {
  if (priority === "critical") return "critical";
  if (priority === "high") return "attention";
  if (priority === "medium") return "dark";
  return "neutral";
}

export function ticketStatusTone(status: TicketStatus): BadgeTone {
  if (status === "open") return "attention";
  if (status === "resolved" || status === "closed") return "muted";
  return "dark";
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
