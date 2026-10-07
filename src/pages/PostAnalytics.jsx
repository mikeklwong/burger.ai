import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Eye, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RATINGS } from "@/lib/ratings";
import { loadUsersByIds } from "@/lib/users";
import UserAvatar from "@/components/UserAvatar";

export default function PostAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [raters, setRaters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const p = await base44.entities.Post.get(id);
        if (p.author_id !== me.id) { navigate(`/post/${id}`); return; }
        setPost(p);
        const rs = await base44.entities.Rating.filter({ post_id: id }, "-created_date", 1000);
        setRatings(rs);
        setRaters(await loadUsersByIds(rs.map((r) => r.user_id)));
      } catch (e) {} finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!post) return null;

  const data = RATINGS.map((r) => ({ name: r.text, value: post[`rating_${r.value}`] || 0, bg: r.bg }));
  const total = post.rating_count || 0;
  const avg = total ? post.avg_score : 0;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold">Insights</h1>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Eye size={16} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-black">{post.view_count || 0}</p>
            <p className="text-[11px] text-muted-foreground">Views</p>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <Star size={16} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-black">{total}</p>
            <p className="text-[11px] text-muted-foreground">Ratings</p>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <p className="mb-1 text-[11px] text-muted-foreground">Avg</p>
            <p className="text-xl font-black">{total ? avg.toFixed(2) : "—"}</p>
            <p className="text-[11px] text-muted-foreground">/ 4.00</p>
          </div>
        </div>

        <h2 className="mb-2 text-sm font-bold">Rating breakdown</h2>
        <div className="mb-6 h-48 rounded-xl bg-secondary p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip cursor={false} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.bg} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h2 className="mb-2 text-sm font-bold">Recent ratings</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ratings yet.</p>
        ) : (
          <div className="space-y-2">
            {ratings.slice(0, 30).map((r) => {
              const rt = RATINGS.find((x) => x.value === r.value);
              const u = raters[r.user_id];
              return (
                <Link key={r.id} to={`/profile/${r.user_id}`} className="flex items-center gap-3 rounded-xl bg-secondary p-2">
                  <UserAvatar user={u} size={32} />
                  <span className="flex-1 text-sm font-semibold">@{u?.username || "user"}</span>
                  <span className="text-sm font-bold" style={{ color: rt?.bg }}>{rt?.emoji} {rt?.text}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}