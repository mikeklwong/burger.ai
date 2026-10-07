export const CATEGORIES = ["Streetwear", "Old Money", "Business Casual", "Formal", "Historical"];

export const RATINGS = [
  { value: "burger", label: "Burger", score: 1, emoji: "🍔", color: "hsl(var(--burger))", bg: "hsl(28 45% 38%)", text: "Burger" },
  { value: "mid", label: "Mid", score: 2, emoji: "😐", color: "hsl(var(--mid))", bg: "hsl(0 0% 55%)", text: "Mid" },
  { value: "fire", label: "Fire", score: 3, emoji: "🔥", color: "hsl(var(--fire))", bg: "hsl(14 88% 56%)", text: "Fire" },
  { value: "tuff", label: "Tuff", score: 4, emoji: "💜", color: "hsl(var(--tuff))", bg: "hsl(276 81% 60%)", text: "Tuff" },
  { value: "iconic", label: "Iconic", score: 5, emoji: "👑", color: "hsl(45 93% 55%)", bg: "hsl(45 93% 52%)", text: "Iconic", rare: true },
];

export const RATING_MAP = RATINGS.reduce((acc, r) => { acc[r.value] = r; return acc; }, {});

// One-word descriptors users can attach after rating (kept short & fixed).
export const RATING_WORDS = ["fit", "clean", "cozy", "bold", "classy", "edgy", "fresh", "minimal", "timeless", "trendy", "effortless", "statement", "sharp", "fun", "elegant", "street"];

export function ratingColor(value) {
  return RATING_MAP[value]?.bg || "hsl(var(--muted))";
}

export function normalizeTag(tag) {
  return String(tag).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function formatCount(n) {
  n = n || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

export function avgScoreFromCounts(counts) {
  const { burger = 0, mid = 0, fire = 0, tuff = 0, iconic = 0 } = counts || {};
  const total = burger + mid + fire + tuff + iconic;
  if (!total) return 0;
  return (burger * 1 + mid * 2 + fire * 3 + tuff * 4 + iconic * 5) / total;
}

export function distribution(counts) {
  const { burger = 0, mid = 0, fire = 0, tuff = 0, iconic = 0 } = counts || {};
  const total = burger + mid + fire + tuff + iconic;
  if (!total) return RATINGS.map((r) => ({ ...r, pct: 0, count: counts[r.value] || 0 }));
  return RATINGS.map((r) => ({ ...r, pct: ((counts[r.value] || 0) / total) * 100, count: counts[r.value] || 0 }));
}