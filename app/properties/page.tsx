import { createClient } from "@/lib/supabase/server";
import {
  PROPERTIES_PAGE_SIZE,
  fetchPropertiesPage,
} from "@/lib/data/properties";
import { PropertiesInfiniteList } from "./properties-infinite";

export default async function PropertiesBrowsePage() {
  const supabase = await createClient();
  const initialItems = await fetchPropertiesPage(supabase, 0);
  const initialHasMore = initialItems.length === PROPERTIES_PAGE_SIZE;

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Browse properties
          </h1>
          <p className="text-muted-foreground">
            Bengaluru listings with community ratings from each note.
          </p>
        </div>
        <PropertiesInfiniteList
          initialItems={initialItems}
          initialHasMore={initialHasMore}
        />
      </div>
    </div>
  );
}
