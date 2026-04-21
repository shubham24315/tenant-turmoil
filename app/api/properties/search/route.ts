import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROPERTIES_PAGE_SIZE,
  fetchPropertiesSearchPage,
  normalizePropertySearchQuery,
} from "@/lib/data/properties";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q") ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));

  if (!normalizePropertySearchQuery(rawQ)) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  const supabase = await createClient();
  const items = await fetchPropertiesSearchPage(supabase, rawQ, page);
  const hasMore = items.length === PROPERTIES_PAGE_SIZE;

  return NextResponse.json({ items, hasMore });
}
