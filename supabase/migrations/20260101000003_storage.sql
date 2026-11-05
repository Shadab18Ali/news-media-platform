-- =============================================================================
-- 0003 · Storage bucket for images
-- Public read (images are published content); only staff can write.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_staff_insert" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_staff());
create policy "media_editor_update" on storage.objects for update
  using (bucket_id = 'media' and public.is_editor()) with check (bucket_id = 'media' and public.is_editor());
create policy "media_editor_delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_editor());
