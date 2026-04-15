import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side sign-out so auth cookies are cleared via the same mechanism as
 * the server client (matches OAuth callback). Client-only signOut can leave
 * cookies that keep getUser() non-null after router.refresh().
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
