import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Check, Globe, Lock } from "lucide-react";

export default function SaveSheet({ open, onOpenChange, postId }) {
  const { toast } = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const cs = await base44.entities.Collection.filter({ user_id: me.id }, "-created_date", 200);
      setCollections(cs);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const toggle = async (col) => {
    setBusy(true);
    try {
      const ids = col.post_ids || [];
      const has = ids.includes(postId);
      const next = has ? ids.filter((x) => x !== postId) : [...ids, postId];
      const cover = !has && ids.length === 0 ? postId : col.cover_post_id;
      await base44.entities.Collection.update(col.id, { post_ids: next, cover_post_id: cover });
      setCollections((prev) => prev.map((c) => c.id === col.id ? { ...c, post_ids: next, cover_post_id: cover } : c));
      if (!has) toast({ title: `Saved to "${col.name}"` });
    } catch (e) {
      toast({ title: "Couldn't update", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const me = await base44.auth.me();
      const c = await base44.entities.Collection.create({ user_id: me.id, name, post_ids: [postId], is_public: false, cover_post_id: postId });
      setCollections((prev) => [c, ...prev]);
      setNewName("");
      toast({ title: `Saved to "${name}"` });
    } catch (e) {
      toast({ title: "Couldn't create", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Save to collection</SheetTitle>
          <SheetDescription>Organize fits you love into curated collections.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {collections.length === 0 && <p className="text-sm text-muted-foreground">No collections yet — create one below.</p>}
              {collections.map((c) => {
                const has = (c.post_ids || []).includes(postId);
                return (
                  <button key={c.id} onClick={() => toggle(c)} disabled={busy} className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {c.is_public ? <Globe size={16} /> : <Lock size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{(c.post_ids || []).length} fits</p>
                    </div>
                    {has && <Check size={18} className="text-primary" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 60))}
            placeholder="New collection name"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button onClick={create} disabled={busy || !newName.trim()} className="rounded-xl">Create</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}