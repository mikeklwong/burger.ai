import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { getBlockedIds, unblockUser } from "@/lib/blocks";
import { loadUsersByIds } from "@/lib/users";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const ids = await getBlockedIds(me.id);
      const map = await loadUsersByIds(ids);
      setBlocked(ids.map((id) => map[id]).filter(Boolean));
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unblock = async (u) => {
    try {
      const me = await base44.auth.me();
      await unblockUser(me.id, u.id);
      toast({ title: `Unblocked @${u.username}` });
      load();
    } catch (e) {
      toast({ title: "Couldn't unblock", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold">Blocked accounts</h1>
      </div>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
        ) : blocked.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">You haven't blocked anyone.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl bg-secondary p-2">
                <UserAvatar user={u} size={36} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">@{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.display_name}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => unblock(u)}>Unblock</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}