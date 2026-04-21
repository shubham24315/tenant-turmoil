"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PropertyListItem } from "@/lib/data/properties";
import { PROPERTIES_PAGE_SIZE } from "@/lib/data/properties";
import { PropertiesResultsMap } from "@/components/properties-results-map";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type BrowseViewMode = "list" | "map";

type Props = {
  initialItems: PropertyListItem[];
  initialHasMore: boolean;
  initialView?: BrowseViewMode;
};

export function PropertiesInfiniteList({
  initialItems,
  initialHasMore,
  initialView = "list",
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<BrowseViewMode>(initialView);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const setViewAndUrl = useCallback(
    (next: BrowseViewMode) => {
      setView(next);
      const params = new URLSearchParams();
      if (next === "map") {
        params.set("view", "map");
      }
      const qs = params.toString();
      router.replace(qs ? `/properties?${qs}` : "/properties", { scroll: false });
    },
    [router],
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/properties?page=${nextPage}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        items: PropertyListItem[];
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...data.items]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No properties yet. Be the first to list yours.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex gap-2 lg:hidden">
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "list"}
            onClick={() => setViewAndUrl("list")}
          >
            List
          </Button>
          <Button
            type="button"
            variant={view === "map" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "map"}
            onClick={() => setViewAndUrl("map")}
          >
            Map
          </Button>
        </div>

        <div
          className={
            view === "list"
              ? "flex flex-col gap-3"
              : "hidden flex-col gap-3 lg:flex"
          }
        >
          {items.map((p) => {
            const avg = p.stats?.avg_rating;
            const label =
              avg != null && !Number.isNaN(Number(avg))
                ? `${Number(avg).toFixed(1)} avg`
                : "No ratings yet";
            return (
              <Link key={p.id} href={`/properties/${p.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base font-medium leading-snug">
                      {p.address}
                    </CardTitle>
                    <Badge variant="secondary">{label}</Badge>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
          <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : null}
          {!hasMore && items.length >= PROPERTIES_PAGE_SIZE ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              You have reached the end.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={
          view === "map"
            ? "w-full min-w-0 lg:sticky lg:top-20 lg:w-[min(100%,480px)] lg:shrink-0"
            : "hidden w-full min-w-0 lg:block lg:sticky lg:top-20 lg:w-[min(100%,480px)] lg:shrink-0"
        }
      >
        <p className="mb-2 text-sm text-muted-foreground lg:hidden">
          Map shows listings with a saved pin inside Bengaluru.
        </p>
        <PropertiesResultsMap items={items} />
        {view === "map" && hasMore ? (
          <div className="mt-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              {loading ? "Loading…" : "Load more listings"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
