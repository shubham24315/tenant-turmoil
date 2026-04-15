-- tenant turmoil: store Photon/OSM geocoding for property addresses
-- new listings from the app should populate latitude, longitude, osm_id, osm_type;
-- legacy rows may have nulls until optionally backfilled.

alter table public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists osm_id bigint,
  add column if not exists osm_type text;

comment on column public.properties.latitude is 'WGS84 latitude from selected Photon/OSM feature; null for legacy rows.';
comment on column public.properties.longitude is 'WGS84 longitude from selected Photon/OSM feature; null for legacy rows.';
comment on column public.properties.osm_id is 'OpenStreetMap object id from Photon properties.osm_id; null for legacy rows.';
comment on column public.properties.osm_type is 'OpenStreetMap type from Photon: N (node), W (way), R (relation); null for legacy rows.';
