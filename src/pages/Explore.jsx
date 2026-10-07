import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import CategoryChips from "@/components/CategoryChips";
import PostGrid from "@/components/PostGrid";
import UserAvatar from "@/components/UserAvatar";
import { normalizeTag } from "@/lib/ratings";
import { rankTrending } from "@/lib/feed";
import { getHiddenUserIds } from "@/lib/blocks";

export default function Explore() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [tagResults, setTagResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hiddenIds, setHiddenIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const me = await api.auth.me();
        const hidden = await getHiddenUserIds(me.id);
        setHiddenIds(hidden);
        const all = await api.entities.Post.list("-created_date", 200);
        const vis = all.filter((p) => !hidden.has(p.author_id));
        const filtered = category ? vis.filter((p) => p.category === category) : vis;
        setPosts(filtered);
        setTopPosts(rankTrending(vis).slice(0, 9));
        // trending tags last 7 days
        const weekAgo = Date.now() - 7 * 86400000;
        const recent = vis.filter((p) => new Date(p.created_date).getTime() > weekAgo);
        const counts = {};
        recent.forEach((p) => (p.tags || []).forEach((t) => { const nt = normalizeTag(t); if (nt) counts[nt] = (counts[nt] || 0) + 1; }));
        setTrendingTags(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, c]) => ({ tag: t, count: c })));
      } catch (e) {}
    })();
  }, [category]);

  useEffect(() => {
    if (!query.trim()) { setUserResults([]); setTagResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const q = query.toLowerCase().replace(/^#/, "");
        const users = await api.entities.User.filter({}, "-created_date", 100);
        setUserResults(users.filter((u) => !hiddenIds.has(u.id) && ((u.username || "").toLowerCase().includes(q) || (u.display_name || "").toLowerCase().includes(q))).slice(0, 8));
        const all = await api.entities.Post.list("-created_date", 200);
        const tagCounts = {};
        all.forEach((p) => (p.tags || []).forEach((tg) => { const nt = normalizeTag(tg); if (nt.includes(q)) tagCounts[nt] = (tagCounts[nt] || 0) + 1; }));
        setTagResults(Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, c]) => ({ tag: t, count: c })));
      } catch (e) {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="mb-3 text-2xl font-black">Explore</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users or #tags"
          className="w-full rounded-full border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </header>

      <div className="px-4">
        {query.trim() ? (
          <div className="py-3">
            {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
            {userResults.length > 0 && (
              <>
                <h3 className="mb-2 text-sm font-bold">People</h3>
                <div className="mb-4 space-y-2">
                  {userResults.map((u) => (
                    <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary">
                      <UserAvatar user={u} size={40} />
                      <div>
                        <p className="text-sm font-semibold">@{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.display_name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {tagResults.length > 0 && (
              <>
                <h3 className="mb-2 text-sm font-bold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tagResults.map((t) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
                      #{t.tag} <span className="text-muted-foreground">{t.count}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {!searching && userResults.length === 0 && tagResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No results.</p>
            )}
          </div>
        ) : (
          <>
            <CategoryChips selected={category} onSelect={setCategory} className="-mx-4" />
            {trendingTags.length > 0 && (
              <div className="py-3">
                <h3 className="mb-2 text-sm font-bold">🔥 Trending Tags (7d)</h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.map((t) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
                      #{t.tag} <span className="text-muted-foreground">{t.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="py-3">
              <h3 className="mb-2 text-sm font-bold">Top this week</h3>
              <PostGrid posts={topPosts} emptyMessage="No trending posts yet" />
            </div>
            <div className="py-3">
              <h3 className="mb-2 text-sm font-bold">{category ? `${category} posts` : "All posts"}</h3>
              <PostGrid posts={posts.slice(0, 30)} emptyMessage="No posts" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}