"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressTypeahead } from "@/components/address-typeahead";
import type { PlaceSuggestion } from "@/lib/places/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

type DraftNote = {
  id: string;
  body: string;
  rating: number;
  files: File[];
};

function extFromFile(file: File): string {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot !== -1) {
    const e = name.slice(dot + 1);
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(e)) {
      return e === "jpeg" ? "jpg" : e;
    }
  }
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function newDraftNote(): DraftNote {
  return {
    id: crypto.randomUUID(),
    body: "",
    rating: 5,
    files: [],
  };
}

function noteNeedsSave(n: DraftNote): boolean {
  return n.body.trim().length > 0 || n.files.length > 0;
}

export function PropertySetupForm() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [notes, setNotes] = useState<DraftNote[]>([newDraftNote()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function updateNote(id: string, patch: Partial<DraftNote>) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    );
  }

  function addNoteBlock() {
    setNotes((prev) => [...prev, newDraftNote()]);
  }

  function removeNoteBlock(id: string) {
    setNotes((prev) => (prev.length <= 1 ? prev : prev.filter((n) => n.id !== id)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError("Add your property address.");
      return;
    }
    if (!selectedPlace || trimmedAddress !== selectedPlace.label.trim()) {
      setError("Choose a suggestion or pin your address on the map.");
      return;
    }

    const toSave = notes.filter(noteNeedsSave);
    for (const n of toSave) {
      if (n.rating < 1 || n.rating > 5) {
        setError("Each note needs a rating from 1 to 5.");
        return;
      }
      if (!n.body.trim() && n.files.length === 0) {
        continue;
      }
      if (!n.body.trim()) {
        setError("Add text for each note that has photos.");
        return;
      }
    }

    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending(false);
      setError("You are not signed in.");
      return;
    }

    const { data: property, error: pErr } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        address: trimmedAddress,
        city: "Bengaluru",
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        osm_id: selectedPlace.kind === "photon" ? selectedPlace.osmId : null,
        osm_type: selectedPlace.kind === "photon" ? selectedPlace.osmType : null,
        location_source: selectedPlace.kind === "photon" ? "photon" : "map",
      })
      .select("id")
      .single();

    if (pErr || !property) {
      setPending(false);
      setError(pErr?.message ?? "Could not save property.");
      return;
    }

    const propertyId = property.id as string;

    for (const n of toSave) {
      const { data: noteRow, error: nErr } = await supabase
        .from("property_notes")
        .insert({
          property_id: propertyId,
          author_id: user.id,
          body: n.body.trim(),
          rating: n.rating,
        })
        .select("id")
        .single();

      if (nErr || !noteRow) {
        setPending(false);
        setError(nErr?.message ?? "Could not save a note.");
        return;
      }

      const noteId = noteRow.id as string;

      for (let i = 0; i < n.files.length; i++) {
        const file = n.files[i];
        const ext = extFromFile(file);
        const path = `${user.id}/${noteId}/${crypto.randomUUID()}.${ext}`;
        const { error: uErr } = await supabase.storage
          .from("note-images")
          .upload(path, file, { upsert: false });

        if (uErr) {
          setPending(false);
          setError(uErr.message);
          return;
        }

        const { error: imgErr } = await supabase.from("note_images").insert({
          note_id: noteId,
          storage_path: path,
          sort_order: i,
        });

        if (imgErr) {
          setPending(false);
          setError(imgErr.message);
          return;
        }
      }
    }

    setPending(false);
    router.refresh();
    router.push(`/properties/${propertyId}`);
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto flex w-full max-w-2xl flex-col gap-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Property</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <AddressTypeahead
            id="address"
            label="Address in Bengaluru"
            value={address}
            onValueChange={setAddress}
            selectedPlace={selectedPlace}
            onSelectedPlaceChange={setSelectedPlace}
            placeholder="Start typing a street or neighbourhood…"
            required
            disabled={pending}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Turmoil notes</h2>
          <p className="text-sm text-muted-foreground">
            Add one or more notes: what went wrong, how you rated the place for
            that issue, and optional photos.
          </p>
        </div>

        {notes.map((n, index) => (
          <Card key={n.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Note {index + 1}</CardTitle>
              {notes.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNoteBlock(n.id)}
                >
                  Remove
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`body-${n.id}`}>What happened?</Label>
                <Textarea
                  id={`body-${n.id}`}
                  value={n.body}
                  onChange={(e) => updateNote(n.id, { body: e.target.value })}
                  placeholder="Leak in the monsoon, daily power cuts, …"
                  rows={4}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Rating for this note</span>
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={n.rating === r ? "default" : "outline"}
                      onClick={() => updateNote(n.id, { rating: r })}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`files-${n.id}`}>Photos</Label>
                <Input
                  id={`files-${n.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    const list = e.target.files;
                    const files = list ? Array.from(list) : [];
                    updateNote(n.id, { files });
                  }}
                />
                {n.files.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {n.files.length} file(s) selected
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addNoteBlock}>
          Add another note
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Separator />

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Spinner />
            Saving…
          </>
        ) : (
          "Save property"
        )}
      </Button>
    </form>
  );
}
