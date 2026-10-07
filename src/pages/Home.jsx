import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import PostCard from "@/components/PostCard";
import CategoryChips from "@/components/CategoryChips";
import { loadUsersByIds } from "@/lib/users";
import { rankForYou, rankTrending, emptyTasteProfile } from "@/lib/feed";
import { getHiddenUserIds } from "@/lib/blocks";

const PAGE_SIZE = 10;

export default function Home() {
  const [tab, setTab] = useState("foryou");
  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [seenIds, setSeenIds] = useState([]);

  const loadFeed = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const me = await api.auth.me();
      const hiddenIds = await getHiddenUserIds(me.id);

      let allPosts = await api.entities.Post.list("-created_date", 200);
      allPosts = allPosts.filter((p) => !hiddenIds.has(p.author_id));
      const myInterests = await api.entities.PostInterest.filter({ user_id: me.id }, "-created_date", 200);
      const markedIds = new Set(myInterests.map((i) => i.post_id));
      allPosts = allPosts.filter((p) => !markedIds.has(p.id));
      if (category) allPosts = allPosts.filter((p) => p.category === category);

      let ranked = [];
      if (tab === "following") {
        const follows = await api.entities.Follow.filter({ follower_id: me.id }, "-created_date", 500);
        const ids = new Set(follows.map((f) => f.following_id));
        ranked = allPosts.filter((p) => ids.has(p.author_id)).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      } else if (tab === "trending") {
        ranked = rankTrending(allPosts);
      } else {
        // foryou
        const myRatings = await api.entities.Rating.filter({ user_id: me.id }, "-created_date", 500);
        const ratedIds = new Set(myRatings.map((r) => r.post_id));
        allPosts = allPosts.filter((p) => !ratedIds.has(p.id));
        // build interest signal posts for similarity scoring
        const interestIds = [...new Set(myInterests.map((i) => i.post_id))];
        let interestPosts = [];
        for (let i = 0; i < interestIds.length; i += 50) {
          const chunk = interestIds.slice(i, i + 50);
          interestPosts.push(...await api.entities.Post.filter({ id: { $in: chunk } }, "-created_date", 50));
        }
        const ipMap = new Map(interestPosts.map((p) => [p.id, p]));
        const interestedPosts = myInterests.filter((i) => i.value === "interested").map((i) => ipMap.get(i.post_id)).filter(Boolean);
        const notInterestedPosts = myInterests.filter((i) => i.value === "not_interested").map((i) => ipMap.get(i.post_id)).filter(Boolean);
        const interests = { interested: interestedPosts, notInterested: notInterestedPosts };
        let tp;
        const tpList = await api.entities.UserTasteProfile.filter({ user_id: me.id }, "-updated_date", 1);
        tp = tpList[0] || emptyTasteProfile();
        if (myRatings.length < 10) {
          // cold start: blend trending
          const trending = rankTrending(allPosts);
          ranked = rankForYou(allPosts, tp, { seenIds, interests });
          // interleave trending first
          ranked = [...trending.slice(0, 5), ...ranked];
        } else {
          ranked = rankForYou(allPosts, tp, { seenIds, interests });
        }
      }

      const aMap = await loadUsersByIds(ranked.map((p) => p.author_id));
      setAuthors((prev) => ({ ...prev, ...aMap }));

      const start = reset ? 0 : (page - 1) * PAGE_SIZE;
      const slice = ranked.slice(start, start + PAGE_SIZE);
      setPosts(slice);
      setHasMore(start + PAGE_SIZE < ranked.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, category, page, seenIds]);

  useEffect(() => { loadFeed(true); setPage(1); setSeenIds([]); /* eslint-disable-next-line */ }, [tab, category]);
  useEffect(() => { if (page > 1) loadFeed(false); /* eslint-disable-next-line */ }, [page]);

  const loadMore = () => { setSeenIds((s) => [...s, ...posts.map((p) => p.id)]); setPage((p) => p + 1); };

  const tabs = [
    { id: "foryou", label: "For You" },
    { id: "following", label: "Following" },
    { id: "trending", label: "Trending" },
  ];

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-primary">burger</span>.ai
          </h1>
        </div>
        <div className="flex gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-sm font-bold transition ${tab === t.id ? "text-foreground" : "text-muted-foreground"}`}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
        <CategoryChips selected={category} onSelect={setCategory} className="px-4" />
      </header>

      <div className="px-3 py-2">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {tab === "following" ? "Follow people to see their fits here." : "No posts in this category yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} author={authors[p.author_id]} />
            ))}
            {hasMore && (
              <button onClick={loadMore} className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground">
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}