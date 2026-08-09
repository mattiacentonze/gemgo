drop policy if exists gempoint_events_insert_client on public.gempoint_events;
drop policy if exists gempoint_events_update_client on public.gempoint_events;

create policy gempoint_events_insert_client on public.gempoint_events
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and trust_level = 'client'
  and status = 'demo'
);

create policy gempoint_events_update_client on public.gempoint_events
for update to authenticated
using (
  (select auth.uid()) = user_id
  and trust_level = 'client'
  and status = 'demo'
)
with check (
  (select auth.uid()) = user_id
  and trust_level = 'client'
  and status = 'demo'
);
