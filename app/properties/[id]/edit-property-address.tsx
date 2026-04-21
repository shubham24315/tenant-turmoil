"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  propertyId: string;
  initialAddress: string;
};

export function EditPropertyAddressSection({ propertyId, initialAddress }: Props) {
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Address cannot be empty.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("properties")
      .update({ address: trimmed })
      .eq("id", propertyId);

    setPending(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit listing address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-property-address">Address</Label>
            <Textarea
              id="edit-property-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} variant="secondary" className="w-fit">
            {pending ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              "Save address"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
