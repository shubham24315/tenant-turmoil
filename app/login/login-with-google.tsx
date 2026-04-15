"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function LoginWithGoogle() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    // Must match Supabase Auth → URL Configuration → Redirect URLs, including
    // this path (e.g. add http://localhost:3000/** and https://your-domain/**).
    // If redirectTo is not allowed, Supabase falls back to Site URL (often prod).
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/`,
      },
    });
    if (error) {
      setPending(false);
      window.location.href = `/login?error=auth`;
    }
  }

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={() => void signIn()}
    >
      {pending ? (
        <>
          <Spinner />
          Redirecting…
        </>
      ) : (
        "Continue with Google"
      )}
    </Button>
  );
}
