"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { avatarUrlFromUser, firstNameFromUser } from "@/lib/auth/display-name";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AppNavProps = {
  user: User | null;
};

export function AppNav({ user }: AppNavProps) {
  const router = useRouter();
  const first = firstNameFromUser(user);
  const avatarUrl = avatarUrlFromUser(user);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Tenant Turmoil
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/properties">Browse</Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                  type="button"
                >
                  <Avatar className="size-8">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {first.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[10rem] truncate text-sm font-medium">
                    {first}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  Signed in as {first}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOutIcon data-icon="inline-start" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
