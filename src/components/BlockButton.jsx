import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Ban, Undo2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { blockUser, unblockUser } from "@/lib/blocks";

export default function BlockButton({ targetUser, onBlocked }) {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const existing = await base44.entities.Block.filter({ blocker_id: me.id, blocked_id: targetUser.id }, "-created_date", 1);
        setBlocked(existing.length > 0);
      } catch (e) {}
    })();
  }, [targetUser.id]);

  const toggle = async () => {
    if (blocked) {
      if (!confirm(`Unblock @${targetUser.username}?`)) return;
      setLoading(true);
      try {
        const me = await base44.auth.me();
        await unblockUser(me.id, targetUser.id);
        setBlocked(false);
        toast({ title: `Unblocked @${targetUser.username}` });
      } catch (e) {
        toast({ title: "Couldn't unblock", variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!confirm(`Block @${targetUser.username}? They won't see your posts or be able to rate you.`)) return;
    setLoading(true);
    try {
      const me = await base44.auth.me();
      await blockUser(me.id, targetUser.id);
      setBlocked(true);
      toast({ title: `Blocked @${targetUser.username}` });
      onBlocked?.();
    } catch (e) {
      toast({ title: "Couldn't block", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggle} disabled={loading} className="text-muted-foreground" title={blocked ? "Unblock" : "Block"}>
      {blocked ? <Undo2 size={20} /> : <Ban size={20} />}
    </button>
  );
}