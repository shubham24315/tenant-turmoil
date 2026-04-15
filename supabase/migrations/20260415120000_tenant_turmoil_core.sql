-- tenant turmoil: properties, notes, images, rating stats view, rls, storage bucket
-- one property per owner (unique on owner_id); notes only by owner on their property

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  address text not null,
  city text not null default 'Bengaluru',
  created_at timestamptz not null default now(),
  constraint properties_owner_id_unique unique (owner_id),
  constraint properties_address_not_empty check (length(trim(address)) > 0)
);

create table public.property_notes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  rating smallint not null,
  created_at timestamptz not null default now(),
  constraint property_notes_rating_range check (rating >= 1 and rating <= 5)
);

create table public.note_images (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.property_notes (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  constraint note_images_path_not_empty check (length(trim(storage_path)) > 0)
);

create index properties_created_at_id_idx on public.properties (created_at desc, id desc);
create index property_notes_property_id_idx on public.property_notes (property_id);
create index note_images_note_id_idx on public.note_images (note_id);

-- ---------------------------------------------------------------------------
-- trigger: note author must own the property
-- ---------------------------------------------------------------------------

create or replace function public.property_notes_enforce_author_is_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.properties p
    where p.id = new.property_id
      and p.owner_id = new.author_id
      and p.owner_id = auth.uid()
  ) then
    raise exception 'property_notes: author must be the property owner';
  end if;
  return new;
end;
$$;

create trigger property_notes_enforce_author_is_owner_trg
  before insert or update on public.property_notes
  for each row
  execute function public.property_notes_enforce_author_is_owner();

-- ---------------------------------------------------------------------------
-- rating aggregates (security invoker: respects base table rls)
-- ---------------------------------------------------------------------------

create or replace view public.property_rating_stats
with (security_invoker = true) as
select
  p.id as property_id,
  count(n.id)::bigint as note_count,
  round(avg(n.rating::numeric), 2) as avg_rating,
  count(n.id) filter (where n.rating = 1)::bigint as count_1,
  count(n.id) filter (where n.rating = 2)::bigint as count_2,
  count(n.id) filter (where n.rating = 3)::bigint as count_3,
  count(n.id) filter (where n.rating = 4)::bigint as count_4,
  count(n.id) filter (where n.rating = 5)::bigint as count_5
from public.properties p
left join public.property_notes n on n.property_id = p.id
group by p.id;

-- ---------------------------------------------------------------------------
-- rls: properties
-- ---------------------------------------------------------------------------

alter table public.properties enable row level security;

create policy "properties_select_anon"
  on public.properties
  for select
  to anon
  using (true);

create policy "properties_select_authenticated"
  on public.properties
  for select
  to authenticated
  using (true);

create policy "properties_insert_own"
  on public.properties
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "properties_update_own"
  on public.properties
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "properties_delete_own"
  on public.properties
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- rls: property_notes
-- ---------------------------------------------------------------------------

alter table public.property_notes enable row level security;

create policy "property_notes_select_anon"
  on public.property_notes
  for select
  to anon
  using (true);

create policy "property_notes_select_authenticated"
  on public.property_notes
  for select
  to authenticated
  using (true);

create policy "property_notes_insert_owner"
  on public.property_notes
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_notes.property_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy "property_notes_update_owner"
  on public.property_notes
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_notes.property_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_notes.property_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy "property_notes_delete_owner"
  on public.property_notes
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_notes.property_id
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- rls: note_images
-- ---------------------------------------------------------------------------

alter table public.note_images enable row level security;

create policy "note_images_select_anon"
  on public.note_images
  for select
  to anon
  using (true);

create policy "note_images_select_authenticated"
  on public.note_images
  for select
  to authenticated
  using (true);

create policy "note_images_insert_note_owner"
  on public.note_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.property_notes n
      join public.properties p on p.id = n.property_id
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
        and p.owner_id = (select auth.uid())
    )
  );

create policy "note_images_update_note_owner"
  on public.note_images
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.property_notes n
      join public.properties p on p.id = n.property_id
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.property_notes n
      join public.properties p on p.id = n.property_id
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
        and p.owner_id = (select auth.uid())
    )
  );

create policy "note_images_delete_note_owner"
  on public.note_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.property_notes n
      join public.properties p on p.id = n.property_id
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- storage: public read for property pages; writes restricted to owner path
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-images',
  'note-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do nothing;

create policy "note_images_storage_select_anon"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'note-images');

create policy "note_images_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'note-images');

create policy "note_images_storage_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "note_images_storage_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "note_images_storage_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
