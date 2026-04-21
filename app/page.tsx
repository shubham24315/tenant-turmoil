import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ctaHref = "/login";
  let ctaLabel = "Log in";

  if (user) {
    ctaHref = "/properties";
    ctaLabel = "Browse properties";
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-16">
        <section className="flex flex-col gap-6">
          <p className="text-sm font-medium text-muted-foreground">
            Built for Bengaluru renters
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Tenant Turmoil
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Track what is wrong with your flat—leaks, outages, noisy
            neighbours—and see how other places compare before you sign the
            next lease.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            {user ? (
              <Button asChild variant="outline" size="lg">
                <Link href="/properties/new">Add a property</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link href="/properties">Browse without signing in</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>List your place</CardTitle>
              <CardDescription>
                Add one or more addresses you rent in Bengaluru, with notes,
                photos, and a rating for each issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Anyone signed in can add their own note on a listing. You can
              update the address on places you listed.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Browse Bengaluru</CardTitle>
              <CardDescription>
                Scroll through properties with average ratings from the
                community.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Open any property for the full story: images, star breakdown, and
              every note.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sign in with Google</CardTitle>
              <CardDescription>
                Quick OAuth so you can publish your listing securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We only use your session to tie listings and notes to your
              account.
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
