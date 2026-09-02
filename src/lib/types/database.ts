export type UserRole = "admin" | "asset_manager" | "operator" | "viewer";

export type AssetStatus =
  | "ordered"
  | "received"
  | "in_stock"
  | "assigned"
  | "in_use"
  | "maintenance"
  | "in_transit"
  | "missing"
  | "returned"
  | "disposal"
  | "written_off";

export type GeofenceShapeType = "polygon" | "circle";

export type AlertType =
  | "geofence_breach"
  | "missing_asset"
  | "warranty_expiry"
  | "maintenance_due"
  | "unassigned_asset"
  | "other";

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "investigating" | "resolved";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "asset_issue"
  | "tracking_issue"
  | "missing_asset"
  | "maintenance"
  | "access"
  | "general_support";

export type LocationSource = "simulation" | "manual" | "gps" | "ble" | "rfid" | "lorawan";

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  created_at: string;
}

export interface AssetCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

export type GeofenceShape =
  | { center: [number, number]; radius_m: number }
  | { points: [number, number][] };

export interface Geofence {
  id: string;
  tenant_id: string;
  location_id: string;
  name: string;
  shape_type: GeofenceShapeType;
  shape: GeofenceShape;
  enabled: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  tenant_id: string;
  asset_tag: string;
  name: string;
  category_id: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  rfid_tag: string | null;

  purchase_date: string | null;
  purchase_price: number | null;
  supplier: string | null;

  assigned_to: string | null;
  department: string | null;
  cost_centre: string | null;

  home_location_id: string | null;
  current_location_id: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_seen_at: string | null;

  warranty_provider: string | null;
  warranty_start: string | null;
  warranty_expiry: string | null;

  status: AssetStatus;
  archived: boolean;

  /** Storage object path within the asset-photos bucket, not a public URL. */
  image_path: string | null;

  created_at: string;
  updated_at: string;
}

export interface AssetLocationHistory {
  id: string;
  tenant_id: string;
  asset_id: string;
  location_id: string | null;
  lat: number;
  lng: number;
  source: LocationSource;
  recorded_at: string;
}

export interface AssetLifecycleEvent {
  id: string;
  tenant_id: string;
  asset_id: string;
  from_status: AssetStatus | null;
  to_status: AssetStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  tenant_id: string;
  asset_id: string;
  description: string;
  vendor: string | null;
  cost: number | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  created_at: string;
}

export interface Alert {
  id: string;
  tenant_id: string;
  type: AlertType;
  severity: AlertSeverity;
  asset_id: string | null;
  location_id: string | null;
  reason: string;
  status: AlertStatus;
  assigned_operator: string | null;
  details: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface HelpdeskTicket {
  id: string;
  tenant_id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requester_id: string | null;
  related_asset_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  tenant_id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_ai: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  tenant_id: string;
  ticket_id: string;
  file_name: string;
  /** Storage object path within the ticket-attachments bucket, not a public URL. */
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  context: "assistant" | "helpdesk" | "alert" | "report";
  provider: string;
  prompt: string;
  response: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
