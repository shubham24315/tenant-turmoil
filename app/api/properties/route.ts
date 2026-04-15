import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROPERTIES_PAGE_SIZE,
  fetchPropertiesPage,
} from "@/lib/data/properties";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
  const supabase = await createClient();
  const items = await fetchPropertiesPage(supabase, page);
  const hasMore = items.length === PROPERTIES_PAGE_SIZE;

  return NextResponse.json({ items, hasMore });
}
