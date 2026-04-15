"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PropertyListItem } from "@/lib/data/properties";
import { PROPERTIES_PAGE_SIZE } from "@/lib/data/properties";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  initialItems: PropertyListItem[];
  initialHasMore: boolean;
};

export function PropertiesInfiniteList({
  initialItems,
  initialHasMore,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    <div className="flex flex-col gap-3">
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
  );
}
