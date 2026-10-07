import React, { useState, useEffect } from "react";
import { RATINGS, RATING_WORDS } from "@/lib/ratings";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Lock } from "lucide-react";

export default function RatingButtons({ post, currentRating, currentWord, onRated, disabled }) {
  const { toast } = useToast();
  const [active, setActive] = useState(currentRating);
  const [wordActive, setWordActive] = useState(currentWord || null);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(null);
  const [showWords, setShowWords] = useState(!!currentRating);
  const [iconicUnlocked, setIconicUnlocked] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = await base44.entities.Rating.filter({ user_id: me.id }, "-created_date", 500);
        const weekly = recent.filter((r) => new Date(r.created_date).getTime() >= weekAgo && r.post_id !== post.id);
        const iconicThisWeek = weekly.filter((r) => r.value === "iconic").length;
        const allowed = Math.max(1, Math.floor(weekly.length * 0.01));
        setIconicUnlocked(iconicThisWeek < allowed);
      } catch (e) {}
    })();
  }, [post.id]);

  const rate = async (value) => {
    if (disabled) return;
    if (value === "iconic" && !iconicUnlocked) {
      toast({ title: "👑 Iconic is a rare vote", description: "Rate more this week to unlock it." });
      return;
    }
    setLoading(true);
    const prev = active;
    try {
      const res = await base44.functions.invoke("ratePost", { post_id: post.id, value });
      if (!res.data || res.data.error) {
        const err = res.data?.error;
        toast({ title: err === "rate_limited" ? "Slow down — too many ratings" : err === "blocked" ? "You can't rate this post" : err === "iconic_locked" ? "Iconic is locked — rate more to unlock" : "Couldn't rate", variant: "destructive" });
        setActive(prev);
        return;
      }
      const counts = res.data.counts;

      // update taste profile
      try {
        const me = await base44.auth.me();
        if (post.author_id !== me.id) {
          const tp = await base44.entities.UserTasteProfile.filter({ user_id: me.id }, "-updated_date", 1);
          const { updateTasteProfile } = await import("@/lib/feed");
          const updated = updateTasteProfile(tp[0] || { category_weights: {}, tag_weights: {}, taste_embedding: [] }, post, value);
          if (tp[0]) await base44.entities.UserTasteProfile.update(tp[0].id, updated);
          else await base44.entities.UserTasteProfile.create({ user_id: me.id, ...updated });
        }
      } catch (e) {}

      setActive(value);
      setBurst(value);
      setTimeout(() => setBurst(null), 500);
      setShowWords(true);
      onRated?.(value, counts, res.data.top_word);
    } catch (e) {
      toast({ title: "Couldn't rate", variant: "destructive" });
      setActive(prev);
    } finally {
      setLoading(false);
    }
  };

  const pickWord = async (word) => {
    if (!active) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("ratePost", { post_id: post.id, value: active, word });
      if (!res.data || res.data.error) {
        toast({ title: "Couldn't save word", variant: "destructive" });
        return;
      }
      setWordActive(word);
      onRated?.(active, res.data.counts, res.data.top_word);
    } catch (e) {
      toast({ title: "Couldn't save word", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {RATINGS.map((r) => {
          const isActive = active === r.value;
          const locked = r.rare && !iconicUnlocked && !isActive;
          return (
            <button
              key={r.value}
              disabled={loading || disabled || locked}
              onClick={() => rate(r.value)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all duration-200 active:scale-90 disabled:opacity-50 ${
                isActive ? "text-white shadow-lg" : "bg-secondary text-secondary-foreground"
              }`}
              style={isActive ? { backgroundColor: r.bg, transform: burst === r.value ? "scale(1.08)" : "scale(1)" } : {}}
              title={locked ? "Rare vote — unlocks as you rate more" : r.text}
            >
              <span className="text-2xl leading-none">{locked ? <Lock size={18} /> : r.emoji}</span>
              <span className="text-[11px] font-bold">{r.text}</span>
              {isActive && (
                <span className="absolute inset-0 rounded-2xl ring-2 ring-offset-2 ring-offset-background" style={{ "--tw-ring-color": r.bg }} />
              )}
            </button>
          );
        })}
      </div>

      {showWords && active && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Add a word{wordActive ? ` · ${wordActive}` : ""}</p>
          <div className="flex flex-wrap gap-1.5">
            {RATING_WORDS.map((w) => (
              <button
                key={w}
                disabled={loading}
                onClick={() => pickWord(w)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${wordActive === w ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}