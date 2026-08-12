-- Qualify the outer Storage object name inside the contribution policy
-- subqueries. An unqualified `name` binds to gem_suggestions.name there,
-- which prevents valid object paths from passing RLS.

begin;

drop policy if exists gem_contribution_upload on storage.objects;
create policy gem_contribution_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gem-contributions'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.gem_suggestions g
      join public.contribution_media cm on cm.contribution_id = g.id
      where g.author_id = (select auth.uid())
        and g.status = 'pending'
        and cm.object_path = storage.objects.name
    )
  );

drop policy if exists gem_contribution_read on storage.objects;
create policy gem_contribution_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gem-contributions'
    and (
      exists (
        select 1
        from public.gem_suggestions g
        join public.contribution_media cm on cm.contribution_id = g.id
        where g.author_id = (select auth.uid())
          and cm.object_path = storage.objects.name
      )
      or (select private.has_min_role('content_editor'))
    )
  );

drop policy if exists gem_contribution_delete on storage.objects;
create policy gem_contribution_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gem-contributions'
    and (
      exists (
        select 1
        from public.gem_suggestions g
        join public.contribution_media cm on cm.contribution_id = g.id
        where g.author_id = (select auth.uid())
          and g.status = 'withdrawn'
          and cm.object_path = storage.objects.name
      )
      or (select private.has_min_role('admin'))
    )
  );

commit;
