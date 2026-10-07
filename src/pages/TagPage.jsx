import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PostGrid from "@/components/PostGrid";
import { normalizeTag } from "@/lib/ratings";
import TagTrend from "@/components/TagTrend";
import { getHiddenUserIds } from "@/lib/blocks";

export default function TagPage() {
  const { tag } = useParams();
  const [sort, setSort] = useState("top");
  const [posts, setPosts] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await base44.auth.me();
        const hiddenIds = await getHiddenUserIds(me.id);
        const all = await base44.entities.Post.list("-created_date", 300);
        const nt = normalizeTag(tag);
        const matching = all.filter((p) => (p.tags || []).some((t) => normalizeTag(t) === nt) && !hiddenIds.has(p.author_id));
        let sorted = [...matching];
        if (sort === "top") sorted.sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
        else sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setPosts(sorted);
        // related tags
        const counts = {};
        matching.forEach((p) => (p.tags || []).forEach((t) => { const x = normalizeTag(t); if (x && x !== nt) counts[x] = (counts[x] || 0) + 1; }));
        setRelated(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t));
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [tag, sort]);

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-2xl font-black">#{normalizeTag(tag)}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{posts.length} posts</span>
          {!loading && posts.length > 0 && <TagTrend posts={posts} />}
        </div>
      </header>
      <div className="px-4">
        <div className="mb-3 flex gap-2">
          <button onClick={() => setSort("top")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "top" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Top</button>
          <button onClick={() => setSort("new")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "new" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>New</button>
        </div>
        {related.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Related tags</p>
            <div className="flex flex-wrap gap-1.5">
              {related.map((t) => (
                <Link key={t} to={`/tag/${t}`} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">#{t}</Link>
              ))}
            </div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div> : <PostGrid posts={posts} emptyMessage="No posts with this tag" />}
      </div>
    </div>
  );
}