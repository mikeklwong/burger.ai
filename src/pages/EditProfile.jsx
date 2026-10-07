import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [picUrl, setPicUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.auth.me().then((m) => {
      setMe(m); setUsername(m.username || ""); setDisplayName(m.display_name || ""); setBio(m.bio || ""); setPicUrl(m.profile_picture || null);
    });
  }, []);

  const pickPic = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await api.integrations.Core.UploadPublicFile({ file });
      setPicUrl(file_url);
    } catch (err) {}
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe({ username, display_name: displayName, bio: bio.slice(0, 150), profile_picture: picUrl });
      toast({ title: "Profile updated" });
      navigate(-1);
    } catch (e) {
      toast({ title: "Couldn't save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!me) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  return (
    <div className="min-h-screen px-4 py-4">
      <h1 className="mb-4 text-2xl font-black">Edit profile</h1>
      <div className="mb-4 flex justify-center">
        <label className="cursor-pointer">
          {picUrl ? <img src={picUrl} alt="avatar" className="h-24 w-24 rounded-full object-cover" /> : <div className="h-24 w-24 rounded-full bg-muted" />}
          <input type="file" accept="image/*" onChange={pickPic} className="hidden" />
          <p className="mt-1 text-center text-xs text-primary">Change photo</p>
        </label>
      </div>
      <label className="mb-1 block text-sm font-semibold">Username</label>
      <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="mb-4 w-full rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" />
      <label className="mb-1 block text-sm font-semibold">Display name</label>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mb-4 w-full rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" />
      <label className="mb-1 block text-sm font-semibold">Bio</label>
      <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} rows={4} className="w-full resize-none rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" />
      <p className="mb-4 text-right text-xs text-muted-foreground">{bio.length}/150</p>
      <Button onClick={save} disabled={saving} className="w-full rounded-full">{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}