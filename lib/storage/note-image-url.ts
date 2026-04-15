export function publicNoteImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const path = storagePath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/note-images/${path}`;
}
