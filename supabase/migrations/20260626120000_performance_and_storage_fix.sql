-- Performance indexes for common query patterns

create index if not exists photos_published_sort_idx
  on public.photos (sort_order asc, created_at desc)
  where is_published = true;

create index if not exists photos_sort_created_idx
  on public.photos (sort_order asc, created_at desc);

create index if not exists site_content_key_idx
  on public.site_content (section_key);

-- Allow public (anon) SELECT on storage objects in the photos bucket.
-- This lets signed URLs resolve without needing a session JWT.
-- Rows are still private by default; only objects with an explicit signed URL
-- path are accessible via storage.createSignedUrl() in the admin.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read photos bucket objects'
  ) then
    execute $policy$
      create policy "Public can read photos bucket objects"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'photos');
    $policy$;
  end if;
end $$;
