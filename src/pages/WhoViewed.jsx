import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { loadUsersByIds } from "@/lib/users";

export default function WhoViewed() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [views, setViews] = useState([]);
  const [viewers, setViewers] = useState({});
  const [counts, setCounts] = useState({ 7: 0, 30: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await base44.auth.me();
        setMe(m);
        const vs = await base44.entities.ProfileView.filter({ viewed_user_id: m.id }, "-viewed_at", 200);
        setViews(vs);
        const aMap = await loadUsersByIds(vs.map((v) => v.viewer_id));
        setViewers(aMap);
        const now = Date.now();
        setCounts({
          7: new Set(vs.filter((v) => now - new Date(v.viewed_at).getTime() < 7 * 86400000).map((v) => v.viewer_id)).size,
          30: new Set(vs.filter((v) => now - new Date(v.viewed_at).getTime() < 30 * 86400000).map((v) => v.viewer_id)).size,
        });
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!me) return null;

  const isPro = me.is_pro;

  return (
    <div className="min-h-screen px-4 py-4">
      <h1 className="mb-4 text-2xl font-black">👀 Who viewed your profile</h1>
      <div className="mb-4 flex gap-3">
        <div className="flex-1 rounded-2xl bg-secondary p-4 text-center">
          <p className="text-2xl font-black">{counts[7]}</p>
          <p className="text-xs text-muted-foreground">unique · 7 days</p>
        </div>
        <div className="flex-1 rounded-2xl bg-secondary p-4 text-center">
          <p className="text-2xl font-black">{counts[30]}</p>
          <p className="text-xs text-muted-foreground">unique · 30 days</p>
        </div>
      </div>

      {isPro ? (
        <div className="space-y-2">
          {views.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No views yet.</p>}
          {views.map((v) => (
            <Link key={v.id} to={`/profile/${v.viewer_id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary">
              <UserAvatar user={viewers[v.viewer_id]} size={40} />
              <div className="flex-1">
                <p className="text-sm font-semibold">@{viewers[v.viewer_id]?.username || "user"}</p>
                <p className="text-xs text-muted-foreground">{new Date(v.viewed_at).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="space-y-2 blur-sm pointer-events-none select-none">
            {views.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl p-2">
                <UserAvatar user={viewers[v.viewer_id]} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">@{viewers[v.viewer_id]?.username || "user"}</p>
                  <p className="text-xs text-muted-foreground">••/••/••••</p>
                </div>
              </div>
            ))}
            {views.length === 0 && <div className="h-32" />}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/70 text-center backdrop-blur-sm">
            <p className="mb-3 text-sm font-semibold">{views.length} people viewed your profile</p>
            <Button onClick={() => navigate("/pro")} className="rounded-full">Unlock with Pro</Button>
          </div>
        </div>
      )}
    </div>
  );
}