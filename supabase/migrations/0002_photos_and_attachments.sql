-- ============================================================
-- Asset photos + helpdesk ticket attachments (Supabase Storage)
-- ============================================================

alter table assets add column if not exists image_path text;

-- Buckets are private; the app reads files back via short-lived signed
-- URLs (see src/lib/storage.ts) rather than public links, consistent with
-- tenant-scoped RLS used everywhere else in this schema.
insert into storage.buckets (id, name, public)
values ('asset-photos', 'asset-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Objects are uploaded under `${tenant_id}/${entity_id}/${filename}` so the
-- first path segment can be checked against the caller's tenant.
create policy asset_photos_tenant_rw on storage.objects
  for all using (
    bucket_id = 'asset-photos'
    and (storage.foldername(name))[1] = current_tenant_id()::text
  )
  with check (
    bucket_id = 'asset-photos'
    and (storage.foldername(name))[1] = current_tenant_id()::text
  );

create policy ticket_attachments_tenant_rw on storage.objects
  for all using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = current_tenant_id()::text
  )
  with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = current_tenant_id()::text
  );
