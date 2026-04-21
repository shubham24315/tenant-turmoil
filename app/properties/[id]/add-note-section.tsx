"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

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

type Props = {
  propertyId: string;
  /** Listing owner may add further notes on their own place. */
  isOwner?: boolean;
};

export function AddNoteSection({ propertyId, isOwner = false }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Describe what happened.");
      return;
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

    const { data: noteRow, error: nErr } = await supabase
      .from("property_notes")
      .insert({
        property_id: propertyId,
        author_id: user.id,
        body: body.trim(),
        rating,
      })
      .select("id")
      .single();

    if (nErr || !noteRow) {
      setPending(false);
      setError(nErr?.message ?? "Could not save note.");
      return;
    }

    const noteId = noteRow.id as string;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

    setBody("");
    setFiles([]);
    setRating(5);
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isOwner ? "Add another note" : "Add a note"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-note-body">What happened?</Label>
            <Textarea
              id="add-note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Rating</span>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={rating === r ? "default" : "outline"}
                  onClick={() => setRating(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-note-files">Photos</Label>
            <Input
              id="add-note-files"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => {
                const list = e.target.files;
                setFiles(list ? Array.from(list) : []);
              }}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              "Publish note"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
