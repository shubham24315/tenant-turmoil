"use client";

import type { PropertyRatingStatsRow } from "@/lib/data/properties";
import { Progress } from "@/components/ui/progress";

type Props = {
  stats: PropertyRatingStatsRow | null;
};

export function RatingBreakdown({ stats }: Props) {
  if (!stats || stats.note_count === 0) {
    return (
      <p className="text-sm text-muted-foreground">No ratings yet.</p>
    );
  }

  const rows = [
    { stars: 5, count: stats.count_5 },
    { stars: 4, count: stats.count_4 },
    { stars: 3, count: stats.count_3 },
    { stars: 2, count: stats.count_2 },
    { stars: 1, count: stats.count_1 },
  ];

  const maxCount = Math.max(
    1,
    stats.count_1,
    stats.count_2,
    stats.count_3,
    stats.count_4,
    stats.count_5,
  );

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ stars, count }) => (
        <div key={stars} className="flex items-center gap-3">
          <span className="w-10 text-sm tabular-nums">{stars} star</span>
          <Progress
            className="h-2 flex-1"
            value={Math.round((count / maxCount) * 100)}
          />
          <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}
