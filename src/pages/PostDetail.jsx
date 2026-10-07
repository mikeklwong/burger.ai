import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/api/client";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import RatingBar from "@/components/RatingBar";
import RatingButtons from "@/components/RatingButtons";
import InterestButtons from "@/components/InterestButtons";
import SaveSheet from "@/components/SaveSheet";
import { loadUser, loadUsersByIds } from "@/lib/users";
import { normalizeTag, formatCount } from "@/lib/ratings";
import { Send, Flag, ArrowLeft, BarChart3, Bookmark } from "lucide-react";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [myRating, setMyRating] = useState(null);
  const [myRatingWord, setMyRatingWord] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentAuthors, setCommentAuthors] = useState({});
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const load = async () => {
    try {
      const me = await api.auth.me();
      const p = await api.entities.Post.get(id);
      setPost(p);
      setAuthor(await loadUser(p.author_id));
      // block check (both directions)
      let isBlocked = false;
      if (p.author_id !== me.id) {
        const bl = await api.entities.Block.filter(
          { $or: [{ blocker_id: me.id, blocked_id: p.author_id }, { blocker_id: p.author_id, blocked_id: me.id }] },
          "-created_date", 1
        );
        isBlocked = bl.length > 0;
        setBlocked(isBlocked);
      }
      // increment view
      if (p.author_id !== me.id && !isBlocked) {
        await api.entities.Post.update(p.id, { view_count: (p.view_count || 0) + 1 });
      }
      const myR = await api.entities.Rating.filter({ user_id: me.id, post_id: id }, "-created_date", 1);
      setMyRating(myR[0]?.value || null);
      setMyRatingWord(myR[0]?.word || null);
      const cs = await api.entities.Comment.filter({ post_id: id }, "-created_date", 100);
      setComments(cs);
      const aMap = await loadUsersByIds(cs.map((c) => c.author_id));
      setCommentAuthors(aMap);
    } catch (e) {
      toast({ title: "Post not found", variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      const me = await api.auth.me();
      const c = await api.entities.Comment.create({ post_id: id, author_id: me.id, text: newComment.trim().slice(0, 500) });
      setComments([c, ...comments]);
      setCommentAuthors((p) => ({ ...p, [me.id]: me }));
      setNewComment("");
      if (post.author_id !== me.id) {
        await api.entities.Notification.create({ user_id: post.author_id, type: "comment", actor_id: me.id, post_id: id });
      }
    } catch (e) {
      toast({ title: "Couldn't comment", variant: "destructive" });
    }
  };

  const report = async () => {
    const reason = prompt("Reason for reporting?");
    if (!reason) return;
    try {
      const me = await api.auth.me();
      await api.entities.Report.create({ reporter_id: me.id, target_type: "post", target_id: id, reason });
      toast({ title: "Reported. Thanks for keeping burger.ai clean." });
    } catch (e) {}
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!post) return null;

  const isOwn = author && post.author_id === author.id;

  if (blocked) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-3 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        </div>
        <div className="py-24 text-center text-sm text-muted-foreground">This post isn't available.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        {author && (
          <Link to={`/profile/${author.id}`} className="flex flex-1 items-center gap-2">
            <UserAvatar user={author} size={32} />
            <span className="font-semibold">@{author.username}</span>
            {author.is_pro && <span className="rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground">PRO</span>}
          </Link>
        )}
        <div className="flex items-center gap-3">
          {isOwn && (
            <Link to={`/post/${id}/analytics`} className="text-muted-foreground" title="Insights"><BarChart3 size={18} /></Link>
          )}
          <button onClick={report} className="text-muted-foreground"><Flag size={18} /></button>
        </div>
      </div>

      <div className="aspect-[4/5] w-full bg-muted">
        <Image src={post.image_url} alt={post.caption} fittingType="fill" className="h-full w-full" />
      </div>

      <div className="px-4 py-4">
        {isOwn ? (
          <p className="mb-3 text-sm text-muted-foreground">You can't rate your own fit — but here's the verdict so far.</p>
        ) : (
          <div className="mb-4">
            <RatingButtons post={post} currentRating={myRating} currentWord={myRatingWord} onRated={(v, counts, topWord) => { setMyRating(v); setPost((p) => ({ ...p, ...counts, top_word: topWord || p.top_word })); }} />
          </div>
        )}

        <div className="mb-4 rounded-xl bg-secondary p-3">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-bold">{post.rating_count ? `${post.avg_score.toFixed(2)}★ avg` : "No ratings yet"}</span>
            <span className="text-muted-foreground">{post.rating_count} ratings · 👁 {formatCount(post.view_count)} views</span>
          </div>
          <RatingBar counts={post} />
          {post.top_word && (
            <p className="mt-2 text-xs text-muted-foreground">Most said: <span className="font-bold text-foreground">"{post.top_word}"</span></p>
          )}
        </div>

        {!isOwn && (
          <div className="mb-4">
            <InterestButtons post={post} />
          </div>
        )}

        <Button variant="outline" onClick={() => setSaveOpen(true)} className="mb-4 w-full rounded-full">
          <Bookmark size={16} /> Save to collection
        </Button>
        <SaveSheet open={saveOpen} onOpenChange={setSaveOpen} postId={post.id} />

        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{post.category}</span>
          {(post.tags || []).map((t) => (
            <Link key={t} to={`/tag/${normalizeTag(t)}`} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              #{normalizeTag(t)}
            </Link>
          ))}
        </div>

        {post.caption && <p className="mb-3 text-sm">{post.caption}</p>}
        {post.style_description && (
          <p className="mb-4 rounded-lg border-l-2 border-primary/40 bg-primary/5 p-2 text-xs italic text-muted-foreground">
            {post.description_source === "ai" ? "AI style notes: " : "Style notes: "}{post.style_description}
          </p>
        )}

        <h3 className="mb-2 text-sm font-bold">Comments</h3>
        <div className="mb-4 space-y-2">
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Be first.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Link to={`/profile/${c.author_id}`}><UserAvatar user={commentAuthors[c.author_id]} size={28} /></Link>
              <div className="flex-1 rounded-xl bg-secondary p-2">
                <span className="text-xs font-semibold">@{commentAuthors[c.author_id]?.username || "user"}</span>
                <p className="text-sm">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <Button size="icon" onClick={submitComment} className="rounded-full"><Send size={18} /></Button>
        </div>
      </div>
    </div>
  );
}