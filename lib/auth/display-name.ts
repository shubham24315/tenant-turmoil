import type { User } from "@supabase/supabase-js";

export function firstNameFromUser(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const given = meta?.given_name;
  if (typeof given === "string" && given.length > 0) return given;
  const full = meta?.full_name;
  if (typeof full === "string" && full.length > 0) {
    const part = full.trim().split(/\s+/)[0];
    return part ?? "You";
  }
  const email = user.email;
  if (email) return email.split("@")[0] ?? "You";
  return "You";
}

export function avatarUrlFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url = meta?.avatar_url;
  return typeof url === "string" ? url : null;
}
