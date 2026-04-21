-- tenant turmoil: multiple listings per account + notes from any signed-in user
--
-- changes:
-- 1) drop unique(owner_id) on properties so users can add more than one address
-- 2) remove trigger that required note author to be the property owner
-- 3) replace property_notes + note_images rls so inserts are allowed for any
--    authenticated author on an existing property; update/delete remain author-only

-- ---------------------------------------------------------------------------
-- properties: allow multiple rows per owner
-- ---------------------------------------------------------------------------

alter table public.properties
  drop constraint if exists properties_owner_id_unique;

comment on table public.properties is
  'Rental listings; each row is one address. Owners may have multiple listings.';

-- ---------------------------------------------------------------------------
-- property_notes: drop author-must-own-property trigger
-- ---------------------------------------------------------------------------

drop trigger if exists property_notes_enforce_author_is_owner_trg on public.property_notes;

drop function if exists public.property_notes_enforce_author_is_owner();

-- ---------------------------------------------------------------------------
-- property_notes: rls — any authenticated user may add a note; only author edits
-- ---------------------------------------------------------------------------

drop policy if exists "property_notes_insert_owner" on public.property_notes;

create policy "property_notes_insert_authenticated"
  on public.property_notes
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_notes.property_id
    )
  );

comment on policy "property_notes_insert_authenticated" on public.property_notes is
  'Signed-in users may post notes on any property; author_id must match the session.';

drop policy if exists "property_notes_update_owner" on public.property_notes;

create policy "property_notes_update_author"
  on public.property_notes
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

comment on policy "property_notes_update_author" on public.property_notes is
  'Only the note author may update their note.';

drop policy if exists "property_notes_delete_owner" on public.property_notes;

create policy "property_notes_delete_author"
  on public.property_notes
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

comment on policy "property_notes_delete_author" on public.property_notes is
  'Only the note author may delete their note.';

-- ---------------------------------------------------------------------------
-- note_images: rls — tie writes to note author (not property owner)
-- ---------------------------------------------------------------------------

drop policy if exists "note_images_insert_note_owner" on public.note_images;

create policy "note_images_insert_note_author"
  on public.note_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.property_notes n
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
    )
  );

comment on policy "note_images_insert_note_author" on public.note_images is
  'Images attach only to notes authored by the current user.';

drop policy if exists "note_images_update_note_owner" on public.note_images;

create policy "note_images_update_note_author"
  on public.note_images
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.property_notes n
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.property_notes n
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
    )
  );

comment on policy "note_images_update_note_author" on public.note_images is
  'Image rows for a note may be updated by the note author.';

drop policy if exists "note_images_delete_note_owner" on public.note_images;

create policy "note_images_delete_note_author"
  on public.note_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.property_notes n
      where n.id = note_images.note_id
        and n.author_id = (select auth.uid())
    )
  );

comment on policy "note_images_delete_note_author" on public.note_images is
  'Image rows for a note may be deleted by the note author.';
