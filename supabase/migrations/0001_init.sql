-- TDS Asset Intelligence Platform — initial schema
-- Multi-tenant via tenant_id + RLS on every table.

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('admin', 'asset_manager', 'operator', 'viewer');

create type asset_status as enum (
  'ordered', 'received', 'in_stock', 'assigned', 'in_use',
  'maintenance', 'in_transit', 'missing', 'returned', 'disposal', 'written_off'
);

create type geofence_shape_type as enum ('polygon', 'circle');

create type alert_type as enum (
  'geofence_breach', 'missing_asset', 'warranty_expiry',
  'maintenance_due', 'unassigned_asset', 'other'
);

create type alert_severity as enum ('low', 'medium', 'high', 'critical');

create type alert_status as enum ('open', 'acknowledged', 'investigating', 'resolved');

create type ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');

create type ticket_priority as enum ('low', 'medium', 'high', 'critical');

create type ticket_category as enum (
  'asset_issue', 'tracking_issue', 'missing_asset', 'maintenance', 'access', 'general_support'
);

create type location_source as enum ('simulation', 'manual', 'gps', 'ble', 'rfid', 'lorawan');

-- ============================================================
-- Tenancy & identity
-- ============================================================
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'viewer',
  department text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Reference data
-- ============================================================
create table asset_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text not null,
  unique (tenant_id, code)
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  address text,
  contact_name text,
  contact_phone text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Geofencing
-- ============================================================
create table geofences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  shape_type geofence_shape_type not null default 'circle',
  -- circle: { "center": [lat, lng], "radius_m": number }
  -- polygon: { "points": [[lat, lng], ...] }
  shape jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table geofence_assets (
  geofence_id uuid not null references geofences(id) on delete cascade,
  asset_id uuid not null,
  primary key (geofence_id, asset_id)
);

-- ============================================================
-- Assets
-- ============================================================
create table assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_tag text not null,               -- e.g. LAP-1024
  name text not null,
  category_id uuid references asset_categories(id),
  manufacturer text,
  model text,
  serial_number text,
  rfid_tag text,

  purchase_date date,
  purchase_price numeric(12,2),
  supplier text,

  assigned_to uuid references user_profiles(id),
  department text,
  cost_centre text,

  home_location_id uuid references locations(id),
  current_location_id uuid references locations(id),
  current_lat double precision,
  current_lng double precision,
  last_seen_at timestamptz,

  warranty_provider text,
  warranty_start date,
  warranty_expiry date,

  status asset_status not null default 'ordered',
  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, asset_tag)
);

alter table geofence_assets
  add constraint geofence_assets_asset_fk foreign key (asset_id) references assets(id) on delete cascade;

create index idx_assets_tenant on assets(tenant_id);
create index idx_assets_status on assets(tenant_id, status);
create index idx_assets_location on assets(tenant_id, current_location_id);

create table asset_location_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  location_id uuid references locations(id),
  lat double precision not null,
  lng double precision not null,
  source location_source not null default 'manual',
  recorded_at timestamptz not null default now()
);
create index idx_alh_asset on asset_location_history(asset_id, recorded_at desc);

create table asset_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  from_status asset_status,
  to_status asset_status not null,
  changed_by uuid references user_profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index idx_ale_asset on asset_lifecycle_events(asset_id, created_at desc);

create table asset_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  assigned_to uuid references user_profiles(id),
  assigned_by uuid references user_profiles(id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);
create index idx_aa_asset on asset_assignments(asset_id, assigned_at desc);

create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  description text not null,
  vendor text,
  cost numeric(12,2),
  started_at date not null default current_date,
  completed_at date,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index idx_mr_asset on maintenance_records(asset_id, started_at desc);

-- ============================================================
-- Alerts
-- ============================================================
create table alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type alert_type not null,
  severity alert_severity not null default 'medium',
  asset_id uuid references assets(id) on delete cascade,
  location_id uuid references locations(id),
  reason text not null,
  status alert_status not null default 'open',
  assigned_operator uuid references user_profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index idx_alerts_tenant on alerts(tenant_id, status);
create index idx_alerts_asset on alerts(asset_id, created_at desc);

-- ============================================================
-- Helpdesk
-- ============================================================
create table helpdesk_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject text not null,
  description text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  category ticket_category not null default 'general_support',
  requester_id uuid references user_profiles(id),
  related_asset_id uuid references assets(id),
  assigned_to uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tickets_tenant on helpdesk_tickets(tenant_id, status);

create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ticket_id uuid not null references helpdesk_tickets(id) on delete cascade,
  author_id uuid references user_profiles(id),
  body text not null,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_comments_ticket on ticket_comments(ticket_id, created_at);

create table ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ticket_id uuid not null references helpdesk_tickets(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Audit & AI
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references user_profiles(id),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity_type, entity_id, created_at desc);
create index idx_audit_tenant on audit_logs(tenant_id, created_at desc);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references user_profiles(id),
  context text not null, -- 'assistant' | 'helpdesk' | 'alert' | 'report'
  provider text not null default 'gemini',
  prompt text not null,
  response text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_ai_conv_tenant on ai_conversations(tenant_id, created_at desc);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_assets_updated_at before update on assets
  for each row execute function set_updated_at();

create trigger trg_tickets_updated_at before update on helpdesk_tickets
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
create or replace function current_tenant_id() returns uuid as $$
  select tenant_id from user_profiles where id = auth.uid()
$$ language sql stable security definer;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tenants','user_profiles','asset_categories','locations','geofences',
    'assets','asset_location_history','asset_lifecycle_events','asset_assignments',
    'maintenance_records','alerts','helpdesk_tickets','ticket_comments',
    'ticket_attachments','audit_logs','ai_conversations'
  ])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy tenant_isolation_tenants on tenants
  for all using (id = current_tenant_id());

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'user_profiles','asset_categories','locations','geofences',
    'assets','asset_location_history','asset_lifecycle_events','asset_assignments',
    'maintenance_records','alerts','helpdesk_tickets','ticket_comments',
    'ticket_attachments','audit_logs','ai_conversations'
  ])
  loop
    execute format(
      'create policy tenant_isolation on %I for all using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id())',
      t
    );
  end loop;
end $$;

create policy geofence_assets_tenant_read on geofence_assets
  for select using (
    exists (select 1 from geofences g where g.id = geofence_id and g.tenant_id = current_tenant_id())
  );
create policy geofence_assets_tenant_write on geofence_assets
  for all using (
    exists (select 1 from geofences g where g.id = geofence_id and g.tenant_id = current_tenant_id())
  ) with check (
    exists (select 1 from geofences g where g.id = geofence_id and g.tenant_id = current_tenant_id())
  );
