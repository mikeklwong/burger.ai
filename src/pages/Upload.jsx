import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import CategoryChips from "@/components/CategoryChips";
import TagInput from "@/components/TagInput";
import { Crown } from "lucide-react";

export default function Upload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [category, setCategory] = useState(null);
  const [tags, setTags] = useState([]);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [stage, setStage] = useState("");
  const [postsToday, setPostsToday] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [resetIn, setResetIn] = useState("");
  const since = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

  const limit = isPro ? 3 : 1;
  const left = Math.max(0, limit - postsToday);
  const atLimit = left === 0;

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setIsPro(!!me.is_pro);
        const mine = await base44.entities.Post.filter({ author_id: me.id }, "-created_date", 50);
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        setPostsToday(mine.filter((p) => new Date(p.created_date) >= startOfDay).length);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date(); d.setHours(24, 0, 0, 0);
      const diff = d.getTime() - Date.now();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setResetIn(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setStage("Uploading image…");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setImageUrl(file_url);
      setStage("");
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
      setStage("");
    }
  };

  const post = async () => {
    if (atLimit) {
      toast({ title: `Daily limit reached (${limit}/day)`, description: isPro ? "Come back tomorrow to post more." : "Upgrade to Pro for 3 posts/day.", variant: "destructive" });
      return;
    }
    if (!imageUrl || !category) {
      toast({ title: "Add a photo and category", variant: "destructive" });
      return;
    }
    setPosting(true);
    setStage("Checking image safety…");
    try {
      const me = await base44.auth.me();
      const safety = await base44.functions.invoke("checkImageSafety", { image_url: imageUrl });
      if (safety.data?.explicit) {
        toast({ title: "Image flagged as explicit", description: "Keep it about the outfits.", variant: "destructive" });
        setPosting(false); setStage("");
        return;
      }
      setStage("Creating post…");
      const res = await base44.functions.invoke("createPost", { image_url: imageUrl, caption, category, tags, since });
      if (!res.data?.post) {
        const d = res.data || {};
        if (d.error === "limit_reached") {
          setPostsToday(d.used ?? postsToday);
          toast({ title: "Daily limit reached", description: isPro ? "Come back tomorrow to post more." : "Upgrade to Pro for 3 posts/day.", variant: "destructive" });
        } else {
          toast({ title: "Couldn't post", description: d.error, variant: "destructive" });
        }
        setPosting(false); setStage("");
        return;
      }
      const postRec = res.data.post;
      setPostsToday(res.data.used);
      setStage("Analyzing your fit with AI…");
      try {
        const ai = await base44.functions.invoke("generateStyleDescription", { image_url: imageUrl, category, tags });
        if (ai.data?.style_description) {
          await base44.entities.Post.update(postRec.id, {
            style_description: ai.data.style_description,
            embedding: ai.data.embedding,
          });
        }
      } catch (e) { /* AI optional */ }
      toast({ title: "Posted! 🔥" });
      navigate(`/post/${postRec.id}`);
    } catch (e) {
      toast({ title: "Couldn't post", description: e.message, variant: "destructive" });
    } finally {
      setPosting(false); setStage("");
    }
  };

  return (
    <div className="min-h-screen px-4 py-4">
      <h1 className="mb-4 text-2xl font-black">New Post</h1>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        className="mb-4 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted"
      >
        {image ? (
          <img src={image} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Tap to pick or take a photo</span>
        )}
      </button>

      <label className="mb-1 block text-sm font-semibold">Category</label>
      <CategoryChips selected={category} onSelect={setCategory} className="-mx-4 mb-4 px-4" />

      <label className="mb-1 block text-sm font-semibold">Tags</label>
      <div className="mb-4"><TagInput tags={tags} onChange={setTags} /></div>

      <label className="mb-1 block text-sm font-semibold">Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 300))}
        placeholder="What's the vibe?"
        rows={3}
        className="mb-1 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <p className="mb-4 text-right text-[11px] text-muted-foreground">{caption.length}/300</p>

      {stage && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          {stage}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{left} of {limit} left today</span>
        {isPro && <span className="flex items-center gap-1 font-semibold text-accent-foreground"><Crown size={12} /> Pro</span>}
      </div>

      {atLimit && (
        <div className="mb-3 rounded-xl border border-border bg-secondary p-3 text-center text-sm">
          <p className="font-semibold">You're out of posts for today</p>
          <p className="text-muted-foreground">Resets in {resetIn}</p>
        </div>
      )}

      {atLimit && !isPro && (
        <button
          onClick={() => navigate("/pro")}
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-left text-sm"
        >
          <Crown size={18} className="shrink-0 text-primary" />
          <span>Go <b>Pro</b> for 3 posts/day + profile views & feed boost.</span>
        </button>
      )}

      <Button onClick={post} disabled={posting || !imageUrl || atLimit} className="w-full rounded-full py-6 text-base font-bold">
        {posting ? "Posting…" : atLimit ? "Daily limit reached" : "Post fit"}
      </Button>
    </div>
  );
}