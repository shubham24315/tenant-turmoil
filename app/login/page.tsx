import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginWithGoogle } from "./login-with-google";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const authError = params.error === "auth";

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Continue with Google to list your flat and add notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {authError ? (
            <p className="text-sm text-destructive" role="alert">
              Something went wrong signing you in. Please try again.
            </p>
          ) : null}
          <LoginWithGoogle />
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
