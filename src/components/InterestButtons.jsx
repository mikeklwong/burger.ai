import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Heart, HeartOff } from "lucide-react";

export default function InterestButtons({ post }) {
  const { toast } = useToast();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const existing = await base44.entities.PostInterest.filter({ user_id: me.id, post_id: post.id }, "-created_date", 1);
        if (existing.length) setState(existing[0].value);
      } catch (e) {}
    })();
  }, [post.id]);

  const mark = async (value) => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      if (state === value) {
        await base44.entities.PostInterest.deleteMany({ user_id: me.id, post_id: post.id });
        setState(null);
      } else {
        await base44.entities.PostInterest.deleteMany({ user_id: me.id, post_id: post.id });
        await base44.entities.PostInterest.create({ user_id: me.id, post_id: post.id, value });
        setState(value);
        toast({ title: value === "interested" ? "We'll show more like this" : "We'll show less like this" });
      }
    } catch (e) {
      toast({ title: "Couldn't update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => mark("interested")}
        disabled={loading}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${state === "interested" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
      >
        <Heart size={16} fill={state === "interested" ? "currentColor" : "none"} /> Interested
      </button>
      <button
        onClick={() => mark("not_interested")}
        disabled={loading}
        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${state === "not_interested" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}
      >
        <HeartOff size={16} /> Not interested
      </button>
    </div>
  );
}