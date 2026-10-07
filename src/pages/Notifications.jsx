import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import UserAvatar from "@/components/UserAvatar";
import { loadUsersByIds } from "@/lib/users";
import { RATINGS } from "@/lib/ratings";

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [actors, setActors] = useState({});
  const [posts, setPosts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.auth.me();
        const ns = await api.entities.Notification.filter({ user_id: me.id }, "-created_date", 100);
        setNotifs(ns);
        const aMap = await loadUsersByIds(ns.map((n) => n.actor_id));
        setActors(aMap);
        // mark read
        ns.filter((n) => !n.read).forEach((n) => api.entities.Notification.update(n.id, { read: true }));
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  return (
    <div>
      <header className="px-4 py-3"><h1 className="text-2xl font-black">Activity</h1></header>
      <div className="px-2">
        {notifs.length === 0 && <p className="px-2 py-10 text-center text-sm text-muted-foreground">No activity yet.</p>}
        {notifs.map((n) => {
          const actor = actors[n.actor_id];
          const r = RATINGS.find((x) => x.value === n.rating_value);
          return (
            <Link key={n.id} to={n.post_id ? `/post/${n.post_id}` : `/profile/${n.actor_id}`} className="flex items-center gap-3 border-b border-border px-2 py-3">
              <UserAvatar user={actor} size={40} />
              <div className="flex-1 text-sm">
                <span className="font-semibold">@{actor?.username || "someone"}</span>{" "}
                {n.type === "follow" && "followed you."}
                {n.type === "rating" && <>rated your fit {r?.emoji} {r?.text}.</>}
                {n.type === "comment" && "commented on your fit."}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}