import { createClient } from "@/lib/supabase/server";
import {
  PROPERTIES_PAGE_SIZE,
  fetchPropertiesPage,
} from "@/lib/data/properties";
import { PropertySearchForm } from "@/components/property-search-form";
import {
  PropertiesInfiniteList,
  type BrowseViewMode,
} from "./properties-infinite";

type Props = {
  searchParams: Promise<{ view?: string }>;
};

function parseBrowseView(raw: string | undefined): BrowseViewMode {
  return raw === "map" ? "map" : "list";
}

export default async function PropertiesBrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialView = parseBrowseView(sp.view);

  const supabase = await createClient();
  const initialItems = await fetchPropertiesPage(supabase, 0);
  const initialHasMore = initialItems.length === PROPERTIES_PAGE_SIZE;

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Browse properties
          </h1>
          <p className="text-muted-foreground">
            Bengaluru listings with community ratings from each note.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Search addresses</p>
          <PropertySearchForm idPrefix="browse-search" />
        </div>
        <PropertiesInfiniteList
          initialItems={initialItems}
          initialHasMore={initialHasMore}
          initialView={initialView}
        />
      </div>
    </div>
  );
}
