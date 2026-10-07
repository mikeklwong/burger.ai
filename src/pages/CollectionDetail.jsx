import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Globe, Lock, Trash2, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { loadUser } from "@/lib/users";

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collection, setCollection] = useState(null);
  const [posts, setPosts] = useState([]);
  const [owner, setOwner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const me = await api.auth.me();
      const c = await api.entities.Collection.get(id);
      if (!c) { navigate("/"); return; }
      const own = c.user_id === me.id;
      setIsOwner(own);
      setOwner(own ? me : await loadUser(c.user_id));
      if (!own && !c.is_public) { navigate("/"); return; }
      setCollection(c);
      const ids = c.post_ids || [];
      const fetched = [];
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const ps = await api.entities.Post.filter({ id: { $in: chunk } }, "-created_date", 50);
        fetched.push(...ps);
      }
      const map = new Map(fetched.map((p) => [p.id, p]));
      setPosts(ids.map((x) => map.get(x)).filter(Boolean));
    } catch (e) {
      toast({ title: "Collection not found", variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const togglePublic = async () => {
    try {
      const next = !collection.is_public;
      await api.entities.Collection.update(collection.id, { is_public: next });
      setCollection({ ...collection, is_public: next });
      toast({ title: next ? "Collection published" : "Collection set to private" });
    } catch (e) {
      toast({ title: "Couldn't update", variant: "destructive" });
    }
  };

  const removePost = async (postId) => {
    const next = (collection.post_ids || []).filter((x) => x !== postId);
    const cover = next.length === 0 ? null : (collection.cover_post_id === postId ? next[0] : collection.cover_post_id);
    try {
      await api.entities.Collection.update(collection.id, { post_ids: next, cover_post_id: cover });
      setCollection({ ...collection, post_ids: next, cover_post_id: cover });
      setPosts((p) => p.filter((x) => x.id !== postId));
    } catch (e) {
      toast({ title: "Couldn't remove", variant: "destructive" });
    }
  };

  const del = async () => {
    if (!confirm("Delete this collection?")) return;
    try {
      await api.entities.Collection.delete(collection.id);
      navigate(-1);
    } catch (e) {
      toast({ title: "Couldn't delete", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!collection) return null;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{collection.name}</h1>
          {owner && <Link to={`/profile/${owner.id}`} className="text-xs text-muted-foreground">@{owner.username}</Link>}
        </div>
        {isOwner && (
          <button onClick={togglePublic} title={collection.is_public ? "Make private" : "Publish"} className="text-muted-foreground">
            {collection.is_public ? <Globe size={20} /> : <Lock size={20} />}
          </button>
        )}
        {isOwner && <button onClick={del} className="text-destructive"><Trash2 size={20} /></button>}
      </div>

      <div className="px-4 py-3">
        {collection.description && <p className="mb-3 text-sm text-muted-foreground">{collection.description}</p>}
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">{posts.length} fits</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">{collection.is_public ? "Public" : "Private"}</span>
        </div>

        {posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No fits saved yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {posts.map((p) => (
              <div key={p.id} className="relative">
                <Link to={`/post/${p.id}`}>
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted">
                    <Image src={p.image_url} fittingType="fill" className="h-full w-full" />
                  </div>
                </Link>
                {isOwner && (
                  <button onClick={() => removePost(p.id)} className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}