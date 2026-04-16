-- tenant turmoil: community-submitted places for autocomplete (map / missing Photon),
-- optional location_source on properties, trigger to index map-based listings.

-- ---------------------------------------------------------------------------
-- extensions
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- properties.location_source
-- ---------------------------------------------------------------------------

alter table public.properties
  add column if not exists location_source text;

comment on column public.properties.location_source is
  'How coordinates were chosen: photon (OSM/Photon pick) or map (manual/community pin without OSM id).';

alter table public.properties
  drop constraint if exists properties_location_source_check;

alter table public.properties
  add constraint properties_location_source_check
  check (location_source is null or location_source in ('photon', 'map'));

-- ---------------------------------------------------------------------------
-- community_places: searchable labels + coordinates contributed by users
-- ---------------------------------------------------------------------------

create table public.community_places (
  id uuid primary key default gen_random_uuid(),
  display_label text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  source_property_id uuid references public.properties (id) on delete set null,
  constraint community_places_display_label_not_empty check (length(trim(display_label)) > 0)
);

comment on table public.community_places is
  'User-contributed address pins (no OSM id) merged into /api/places/autocomplete for other users.';

create index community_places_display_label_trgm_idx
  on public.community_places
  using gin (display_label gin_trgm_ops);

create index community_places_created_at_id_idx
  on public.community_places (created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- rls: community_places
-- ---------------------------------------------------------------------------

alter table public.community_places enable row level security;

-- public read for autocomplete merge (server uses service role; anon app may read for future client use)
create policy "community_places_select_anon"
  on public.community_places
  for select
  to anon
  using (true);

create policy "community_places_select_authenticated"
  on public.community_places
  for select
  to authenticated
  using (true);

create policy "community_places_insert_authenticated"
  on public.community_places
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- after insert on properties: index map/community pins (no OSM id) once
-- ---------------------------------------------------------------------------

create or replace function public.properties_insert_community_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.latitude is not null
     and new.longitude is not null
     and new.osm_id is null
     and length(trim(new.address)) > 0
  then
    if not exists (
      select 1
      from public.community_places cp
      where lower(trim(cp.display_label)) = lower(trim(new.address))
        and round(cp.latitude::numeric, 5) = round(new.latitude::numeric, 5)
        and round(cp.longitude::numeric, 5) = round(new.longitude::numeric, 5)
    ) then
      insert into public.community_places (
        display_label,
        latitude,
        longitude,
        created_by,
        source_property_id
      )
      values (
        trim(new.address),
        new.latitude,
        new.longitude,
        new.owner_id,
        new.id
      );
    end if;
  end if;
  return new;
end;
$$;

comment on function public.properties_insert_community_place() is
  'Adds a community_places row when a property is saved with coordinates but no OSM id (map/community pick).';

create trigger properties_insert_community_place_trg
  after insert on public.properties
  for each row
  execute function public.properties_insert_community_place();
