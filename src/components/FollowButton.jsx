import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function FollowButton({ targetUser, onChange = undefined }) {
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await api.auth.me();
        if (!me || me.id === targetUser.id) return;
        const existing = await api.entities.Follow.filter({ follower_id: me.id, following_id: targetUser.id }, "-created_date", 1);
        if (active) setFollowing(existing.length > 0);
      } catch (e) {}
    })();
    return () => { active = false; };
  }, [targetUser.id]);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await api.functions.invoke("toggleFollow", { target_id: targetUser.id });
      if (!res.data || res.data.error) {
        const err = res.data?.error;
        toast({ title: err === "rate_limited" ? "Slow down — too many follows" : err === "blocked" ? "You can't follow this account" : "Something went wrong", variant: "destructive" });
        return;
      }
      setFollowing(res.data.following);
      onChange?.(res.data.following);
    } catch (e) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "default"}
      onClick={toggle}
      disabled={loading}
      className="rounded-full font-semibold"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}