import { createClient } from "@/lib/supabase/server";
import {
  PROPERTIES_PAGE_SIZE,
  fetchPropertiesSearchPage,
  normalizePropertySearchQuery,
} from "@/lib/data/properties";
import { PropertySearchForm } from "@/components/property-search-form";
import {
  PropertySearchResults,
  type ResultsViewMode,
} from "./property-search-results";

type Props = {
  searchParams: Promise<{ q?: string; view?: string }>;
};

function parseView(raw: string | undefined): ResultsViewMode {
  return raw === "map" ? "map" : "list";
}

export default async function PropertySearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rawQ = typeof sp.q === "string" ? sp.q : "";
  const normalized = normalizePropertySearchQuery(rawQ);
  const initialView = parseView(sp.view);

  if (!normalized) {
    return (
      <div className="flex flex-1 flex-col bg-background px-4 py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Search properties</h1>
            <p className="text-muted-foreground">
              Enter at least two characters to search addresses and areas across Bengaluru.
            </p>
          </div>
          <PropertySearchForm defaultQuery={rawQ.trim()} idPrefix="search-page" />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const initialItems = await fetchPropertiesSearchPage(supabase, rawQ, 0);
  const initialHasMore = initialItems.length === PROPERTIES_PAGE_SIZE;

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Search results</h1>
          <p className="text-muted-foreground">
            Full-text search over listings; switch to map to see pinned places and ratings.
          </p>
        </div>
        <PropertySearchResults
          initialQuery={rawQ.trim()}
          normalizedQuery={normalized}
          initialItems={initialItems}
          initialHasMore={initialHasMore}
          initialView={initialView}
        />
      </div>
    </div>
  );
}
