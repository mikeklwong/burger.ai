import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import CategoryChips from "@/components/CategoryChips";
import TagInput from "@/components/TagInput";


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
  const [resetAt, setResetAt] = useState(Date.now() + 86400000);
  const since = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

  const limit = 20;
  const left = Math.max(0, limit - postsToday);
  const atLimit = left === 0;

  useEffect(() => {
    (async () => {
      try {
        const me = await api.auth.me();
        setIsPro(!!me.is_pro);
        const mine = await api.entities.Post.filter({ author_id: me.id }, "-created_date", 50);
        const recent = mine.filter((p) => Date.now() - Date.parse(p.created_date) < 86400000);
        setPostsToday(recent.length);
        if (recent.length) setResetAt(Math.min(...recent.map((p) => Date.parse(p.created_date))) + 86400000);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, resetAt - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setResetIn(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetAt]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast({ title: "Choose an image under 8 MB", variant: "destructive" }); return; }
    setImageUrl(null);
    setImage(URL.createObjectURL(file));
    setStage("Uploading image…");
    try {
      const { file_url } = await api.integrations.Core.UploadPublicFile({ file });
      setImageUrl(file_url);
      setStage("");
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
      setStage("");
    }
  };

  const post = async () => {
    if (atLimit) {
      toast({ title: `Daily limit reached (${limit}/day)`, description: "Come back tomorrow to post more.", variant: "destructive" });
      return;
    }
    if (!imageUrl || !category) {
      toast({ title: "Add a photo and category", variant: "destructive" });
      return;
    }
    setPosting(true);
    setStage("Preparing your post…");
    try {
      const me = await api.auth.me();
      const safety = await api.functions.invoke("checkImageSafety", { image_url: imageUrl });
      if (safety.data?.explicit) {
        toast({ title: "Image flagged as explicit", description: "Keep it about the outfits.", variant: "destructive" });
        setPosting(false); setStage("");
        return;
      }
      setStage("Creating post…");
      const res = await api.functions.invoke("createPost", { image_url: imageUrl, caption, category, tags, since });
      if (!res.data?.post) {
        const d = res.data || {};
        if (d.error === "limit_reached") {
          setPostsToday(d.used ?? postsToday);
          toast({ title: "Daily limit reached", description: "Come back tomorrow to post more.", variant: "destructive" });
        } else {
          toast({ title: "Couldn't post", description: d.error, variant: "destructive" });
        }
        setPosting(false); setStage("");
        return;
      }
      const postRec = res.data.post;
      setPostsToday(res.data.used);
      setStage("Adding style notes…");
      try {
        const ai = await api.functions.invoke("generateStyleDescription", { image_url: imageUrl, category, tags });
        if (ai.data?.style_description) {
          await api.entities.Post.update(postRec.id, {
            style_description: ai.data.style_description,
            embedding: ai.data.embedding,
            description_source: ai.data.description_source,
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
      <p className="mb-4 text-xs text-muted-foreground">Share photos you have permission to post. Image analysis is optional; without it, descriptions use your tags and automated content checks are unavailable.</p>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        aria-label="Choose an outfit photo"
        className="mb-4 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted"
      >
        {image ? (
          <img src={image} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Choose an outfit photo</span>
        )}
      </button>

      <label className="mb-1 block text-sm font-semibold">Category</label>
      <CategoryChips selected={category} onSelect={setCategory} className="-mx-4 mb-4 px-4" />

      <label className="mb-1 block text-sm font-semibold">Tags</label>
      <div className="mb-4"><TagInput tags={tags} onChange={setTags} /></div>

      <label htmlFor="caption" className="mb-1 block text-sm font-semibold">Caption</label>
      <textarea
        id="caption"
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
        {isPro && <span className="text-accent-foreground">Free edition</span>}
      </div>

      {atLimit && (
        <div className="mb-3 rounded-xl border border-border bg-secondary p-3 text-center text-sm">
          <p className="font-semibold">You're out of posts for today</p>
          <p className="text-muted-foreground">Resets in {resetIn}</p>
        </div>
      )}

      <Button onClick={post} disabled={posting || !imageUrl || atLimit} className="w-full rounded-full py-6 text-base font-bold">
        {posting ? "Posting…" : atLimit ? "Daily limit reached" : "Post fit"}
      </Button>
    </div>
  );
}