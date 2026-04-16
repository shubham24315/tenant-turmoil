-- tenant turmoil: durable server-side cache for Photon/Komoot address autocomplete
-- rows are populated only by the Next.js API route using the service role (bypasses RLS).
-- TTL is enforced in application code (expires_at); data is derived from public Photon/OSM.

-- ---------------------------------------------------------------------------
-- table
-- ---------------------------------------------------------------------------

create table public.place_autocomplete_cache (
  cache_key text primary key,
  suggestions jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.place_autocomplete_cache is
  'Read-through cache for /api/places/autocomplete; suggestions match PhotonPlaceSuggestion[] shape.';

create index place_autocomplete_cache_expires_at_idx
  on public.place_autocomplete_cache (expires_at);

-- ---------------------------------------------------------------------------
-- rls: no policies for anon or authenticated — table is server-only via service_role
-- ---------------------------------------------------------------------------

alter table public.place_autocomplete_cache enable row level security;
