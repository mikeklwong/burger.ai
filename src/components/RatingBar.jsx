import React from "react";
import { distribution } from "@/lib/ratings";

export default function RatingBar({ counts, showLabels = true }) {
  const dist = distribution(counts);
  const total = dist.reduce((s, d) => s + d.count, 0);
  return (
    <div className="w-full">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {dist.map((d) => (
          <div
            key={d.value}
            style={{ width: `${d.pct}%`, backgroundColor: d.bg }}
            className="h-full transition-all duration-500"
          />
        ))}
      </div>
      {showLabels && total > 0 && (
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          {dist.map((d) => (
            <span key={d.value} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.bg }} />
              {d.text} {Math.round(d.pct)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}