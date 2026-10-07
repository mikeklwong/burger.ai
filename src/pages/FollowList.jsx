import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { loadUsersByIds } from "@/lib/users";

export default function FollowList() {
  const { id, type } = useParams(); // type: followers | following
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let follows;
        if (type === "followers") {
          follows = await base44.entities.Follow.filter({ following_id: id }, "-created_date", 500);
        } else {
          follows = await base44.entities.Follow.filter({ follower_id: id }, "-created_date", 500);
        }
        const ids = follows.map((f) => (type === "followers" ? f.follower_id : f.following_id));
        const map = await loadUsersByIds(ids);
        setUsers(ids.map((i) => map[i]).filter(Boolean));
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [id, type]);

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-bold">{type === "followers" ? "Followers" : "Following"}</h1>
      </header>
      <div className="px-2">
        {loading && <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>}
        {!loading && users.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nobody here yet.</p>}
        {users.map((u) => (
          <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 border-b border-border px-2 py-3">
            <UserAvatar user={u} size={44} />
            <div className="flex-1">
              <p className="text-sm font-semibold">@{u.username}</p>
              <p className="text-xs text-muted-foreground">{u.display_name}</p>
            </div>
            <FollowButton targetUser={u} />
          </Link>
        ))}
      </div>
    </div>
  );
}