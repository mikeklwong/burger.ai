import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// 7-day sparkline + rising/falling label for a set of posts sharing a tag.
export default function TagTrend({ posts }) {
  const { points, label, Icon, color } = useMemo(() => {
    const days = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getTime() - i * 86400000);
      const end = new Date(start.getTime() + 86400000);
      const count = posts.filter((p) => {
        const d = new Date(p.created_date);
        return d >= start && d < end;
      }).length;
      days.push(count);
    }
    const recent = days.slice(4).reduce((a, b) => a + b, 0); // last 3 days
    const prior = days.slice(0, 4).reduce((a, b) => a + b, 0); // prior 4 days
    let label = "Steady", Icon = Minus, color = "text-muted-foreground";
    if (prior === 0 && recent > 0) { label = "Rising"; Icon = TrendingUp; color = "text-emerald-500"; }
    else if (recent > prior * 1.1) { label = "Rising"; Icon = TrendingUp; color = "text-emerald-500"; }
    else if (recent < prior * 0.9) { label = "Cooling"; Icon = TrendingDown; color = "text-rose-500"; }
    return { points: days, label, Icon, color };
  }, [posts]);

  const max = Math.max(1, ...points);
  const w = 80, h = 24;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`);

  return (
    <div className="flex items-center gap-2 text-xs">
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      </svg>
      <span className={`flex items-center gap-1 font-semibold ${color}`}><Icon size={14} /> {label}</span>
    </div>
  );
}