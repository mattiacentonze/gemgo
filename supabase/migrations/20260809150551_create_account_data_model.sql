create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'GemGo traveller' check (char_length(display_name) between 1 and 120),
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_trips (
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text not null check (char_length(trip_id) between 1 and 160),
  name text not null check (char_length(name) between 1 and 200),
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, trip_id)
);
create index saved_trips_user_updated_idx on public.saved_trips (user_id, updated_at desc);

create table public.saved_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id text not null check (char_length(collection_id) between 1 and 160),
  name text not null check (char_length(name) between 1 and 200),
  region text not null check (char_length(region) between 1 and 160),
  experience_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);

create table public.gempoint_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 200),
  amount integer not null,
  event_type text not null check (event_type in ('visit','gemdrop','mobility','partner','contribution','redemption','demo')),
  label text not null check (char_length(label) between 1 and 500),
  created_at timestamptz not null,
  balance_after integer not null check (balance_after >= 0),
  status text not null check (status in ('demo','verified')),
  metadata jsonb,
  trust_level text not null default 'client' check (trust_level in ('client','server')),
  primary key (user_id, event_id)
);
create index gempoint_events_user_created_idx on public.gempoint_events (user_id, created_at);

create table public.connected_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('strava','garmin','apple-health','health-connect')),
  provider_user_id text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  primary key (user_id, provider)
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.connected_account_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('strava','garmin','apple-health','health-connect')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id text not null,
  method text not null check (method in ('gps','photo','partner-code','strava','garmin','demo')),
  status text not null default 'pending' check (status in ('pending','demo','verified','rejected')),
  evidence jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index verifications_user_created_idx on public.verifications (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.saved_trips enable row level security;
alter table public.saved_collections enable row level security;
alter table public.gempoint_events enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.verifications enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy saved_trips_select_own on public.saved_trips for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_trips_insert_own on public.saved_trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_trips_update_own on public.saved_trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_trips_delete_own on public.saved_trips for delete to authenticated using ((select auth.uid()) = user_id);

create policy saved_collections_select_own on public.saved_collections for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_collections_insert_own on public.saved_collections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_collections_update_own on public.saved_collections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_collections_delete_own on public.saved_collections for delete to authenticated using ((select auth.uid()) = user_id);

create policy gempoint_events_select_own on public.gempoint_events for select to authenticated using ((select auth.uid()) = user_id);
create policy gempoint_events_insert_client on public.gempoint_events for insert to authenticated with check ((select auth.uid()) = user_id and trust_level = 'client');
create policy gempoint_events_update_client on public.gempoint_events for update to authenticated using ((select auth.uid()) = user_id and trust_level = 'client') with check ((select auth.uid()) = user_id and trust_level = 'client');

create policy connected_accounts_select_own on public.connected_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy connected_accounts_insert_own on public.connected_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy connected_accounts_update_own on public.connected_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy connected_accounts_delete_own on public.connected_accounts for delete to authenticated using ((select auth.uid()) = user_id);

create policy verifications_select_own on public.verifications for select to authenticated using ((select auth.uid()) = user_id);
create policy verifications_insert_client on public.verifications for insert to authenticated with check ((select auth.uid()) = user_id and status in ('pending','demo'));
create policy verifications_delete_pending on public.verifications for delete to authenticated using ((select auth.uid()) = user_id and status in ('pending','demo'));

revoke all on public.profiles, public.saved_trips, public.saved_collections, public.gempoint_events, public.connected_accounts, public.verifications from anon;
grant select, insert, update, delete on public.profiles, public.saved_trips, public.saved_collections, public.connected_accounts to authenticated;
grant select, insert, update on public.gempoint_events to authenticated;
grant select, insert, delete on public.verifications to authenticated;
