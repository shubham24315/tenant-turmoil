import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PropertyRatingStatsRow, PropertyRow } from "@/lib/data/properties";
import { publicNoteImageUrl } from "@/lib/storage/note-image-url";
import { ImageCarousel } from "@/components/image-carousel";
import { RatingBreakdown } from "./rating-breakdown";
import { AddNoteSection } from "./add-note-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type NoteImageRow = {
  id: string;
  storage_path: string;
  sort_order: number;
};

type NoteRow = {
  id: string;
  body: string;
  rating: number;
  created_at: string;
  note_images: NoteImageRow[] | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property, error: pErr } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (pErr || !property) {
    notFound();
  }

  const row = property as PropertyRow;

  const { data: statsRaw } = await supabase
    .from("property_rating_stats")
    .select("*")
    .eq("property_id", id)
    .maybeSingle();

  const stats = statsRaw as PropertyRatingStatsRow | null;

  const { data: notesRaw } = await supabase
    .from("property_notes")
    .select(
      `
      id,
      body,
      rating,
      created_at,
      note_images (
        id,
        storage_path,
        sort_order
      )
    `,
    )
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  const notes = (notesRaw ?? []) as NoteRow[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === row.owner_id;

  const sortedNotes = notes.map((n) => ({
    ...n,
    note_images: [...(n.note_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));

  const heroUrls = sortedNotes.flatMap((n) =>
    n.note_images.map((img) => publicNoteImageUrl(img.storage_path)),
  );

  const avgLabel =
    stats?.avg_rating != null && stats.note_count > 0
      ? `${Number(stats.avg_rating).toFixed(1)} average (${stats.note_count} notes)`
      : "No ratings yet";

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
            <Link href="/properties">← All properties</Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight leading-snug">
            {row.address}
          </h1>
          <p className="text-sm text-muted-foreground">{row.city}</p>
          <Badge variant="secondary" className="w-fit">
            {avgLabel}
          </Badge>
        </div>

        {heroUrls.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Photos</h2>
            <ImageCarousel urls={heroUrls} alt={`Photos for ${row.address}`} />
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Rating breakdown</h2>
          <RatingBreakdown stats={stats} />
        </section>

        {isOwner ? <AddNoteSection propertyId={row.id} /> : null}

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          {sortedNotes.length === 0 ? (
            <p className="text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedNotes.map((n) => {
                const urls = n.note_images.map((img) =>
                  publicNoteImageUrl(img.storage_path),
                );
                return (
                  <Card key={n.id}>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {n.rating} / 5
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {n.body}
                      </p>
                      {urls.length > 0 ? (
                        <ImageCarousel
                          urls={urls}
                          alt={`Note images for ${row.address}`}
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
