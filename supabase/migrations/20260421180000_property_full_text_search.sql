-- property full-text search: generated tsvector on address + city, GIN index,
-- and invoker-security RPC for ranked search with rating stats (public read via RLS).

-- ---------------------------------------------------------------------------
-- search_vector: indexed document for FTS (english config)
-- ---------------------------------------------------------------------------

alter table public.properties
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(address, '') || ' ' || coalesce(city, '')
    )
  ) stored;

comment on column public.properties.search_vector is
  'Full-text document for address and city; used by search_properties().';

create index if not exists properties_search_vector_gin_idx
  on public.properties
  using gin (search_vector);

-- ---------------------------------------------------------------------------
-- search_properties: ranked FTS + property_rating_stats in one round-trip
-- security invoker: respects RLS on properties (same as direct select).
-- ---------------------------------------------------------------------------

create or replace function public.search_properties(
  search_query text,
  result_limit integer default 20,
  result_offset integer default 0
)
returns table (
  id uuid,
  owner_id uuid,
  address text,
  city text,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  osm_id bigint,
  osm_type text,
  location_source text,
  note_count bigint,
  avg_rating numeric,
  count_1 bigint,
  count_2 bigint,
  count_3 bigint,
  count_4 bigint,
  count_5 bigint,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(least(coalesce(result_limit, 20), 100), 1) as lim,
      greatest(coalesce(result_offset, 0), 0) as off
  ),
  qtext as (
    select trim(coalesce(search_query, '')) as t
  ),
  q as (
    select websearch_to_tsquery('english', qtext.t) as tsq
    from qtext
    where char_length(qtext.t) >= 1
  )
  select
    p.id,
    p.owner_id,
    p.address,
    p.city,
    p.created_at,
    p.latitude,
    p.longitude,
    p.osm_id,
    p.osm_type,
    p.location_source,
    coalesce(prs.note_count, 0)::bigint as note_count,
    prs.avg_rating,
    coalesce(prs.count_1, 0)::bigint as count_1,
    coalesce(prs.count_2, 0)::bigint as count_2,
    coalesce(prs.count_3, 0)::bigint as count_3,
    coalesce(prs.count_4, 0)::bigint as count_4,
    coalesce(prs.count_5, 0)::bigint as count_5,
    ts_rank(p.search_vector, q.tsq)::real as rank
  from public.properties p
  left join public.property_rating_stats prs on prs.property_id = p.id
  cross join q
  cross join bounds
  where p.search_vector @@ q.tsq
  order by rank desc, p.created_at desc, p.id desc
  limit (select lim from bounds)
  offset (select off from bounds);
$$;

comment on function public.search_properties(text, integer, integer) is
  'Full-text search over properties (address, city) with rating aggregates; limit/offset clamped.';

grant execute on function public.search_properties(text, integer, integer) to anon;

grant execute on function public.search_properties(text, integer, integer) to authenticated;
