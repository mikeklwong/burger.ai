import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { CATEGORIES, RATINGS, normalizeTag } from "@/lib/ratings";
import { seedTasteProfile } from "@/lib/feed";
import FollowButton from "@/components/FollowButton";

const TOTAL_STEPS = 7;

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameOk, setUsernameOk] = useState(null);
  const [bio, setBio] = useState("");
  const [pic, setPic] = useState(null);
  const [picUrl, setPicUrl] = useState(null);
  const [favCats, setFavCats] = useState([]);
  const [favTags, setFavTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [suggested, setSuggested] = useState([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const m = await base44.auth.me();
        setMe(m);
        setUsername(m.username || "");
        setDisplayName(m.display_name || m.full_name || "");
        setBio(m.bio || "");
        setPicUrl(m.profile_picture || null);
      } catch (e) { navigate("/login"); }
    })();
  }, []);

  React.useEffect(() => {
    if (step !== 1 || !username) return;
    const t = setTimeout(async () => {
      try {
        const users = await base44.entities.User.filter({}, "-created_date", 200);
        const taken = users.some((u) => u.username?.toLowerCase() === username.toLowerCase() && u.id !== me.id);
        setUsernameOk(!taken && username.length >= 3);
      } catch (e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [username, step, me]);

  React.useEffect(() => {
    if (step !== 5) return;
    (async () => {
      try {
        const users = await base44.entities.User.filter({}, "-created_date", 100);
        setSuggested(users.filter((u) => u.id !== me.id).slice(0, 8));
      } catch (e) {}
    })();
  }, [step, me]);

  const pickPic = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPic(URL.createObjectURL(file));
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setPicUrl(file_url);
    } catch (err) {}
  };

  const addTag = () => {
    const t = normalizeTag(tagInput);
    if (t && !favTags.includes(t) && favTags.length < 8) setFavTags([...favTags, t]);
    setTagInput("");
  };

  const finish = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        username, display_name: displayName, bio: bio.slice(0, 150),
        profile_picture: picUrl, favorite_categories: favCats, followed_tags: favTags,
        onboarding_complete: true,
      });
      // seed taste profile
      const tp = seedTasteProfile(favCats, favTags);
      await base44.entities.UserTasteProfile.create({ user_id: me.id, ...tp });
      toast({ title: "Welcome to burger.ai! 🔥" });
      navigate("/");
    } catch (e) {
      toast({ title: "Couldn't finish onboarding", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen px-5 py-6">
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <h1 className="mb-2 text-4xl font-black"><span className="text-primary">burger</span>.ai</h1>
          <p className="mb-8 text-muted-foreground">Rate fits. Find your people.</p>
          <div className="mb-8 grid w-full max-w-xs grid-cols-2 gap-3">
            {RATINGS.map((r) => (
              <div key={r.value} className="flex flex-col items-center gap-1 rounded-2xl p-4" style={{ backgroundColor: r.bg }}>
                <span className="text-3xl">{r.emoji}</span>
                <span className="font-bold text-white">{r.text}</span>
                <span className="text-xs text-white/80">{r.score}/4</span>
              </div>
            ))}
          </div>
          <p className="mb-8 text-sm text-muted-foreground">🍔 Burger = bad · 😐 Mid = meh · 🔥 Fire = great · 💜 Tuff = elite</p>
        </div>
      )}

      {step === 1 && (
        <div className="py-6">
          <h2 className="mb-1 text-2xl font-bold">Pick your handle</h2>
          <p className="mb-6 text-sm text-muted-foreground">This is how people find you.</p>
          <label className="mb-1 block text-sm font-semibold">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="mb-1 w-full rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" placeholder="coolfitguy" />
          <p className={`mb-4 text-xs ${usernameOk === true ? "text-green-500" : usernameOk === false ? "text-destructive" : "text-muted-foreground"}`}>
            {usernameOk === true ? "✓ Available" : usernameOk === false ? "✗ Taken or too short" : "At least 3 chars"}
          </p>
          <label className="mb-1 block text-sm font-semibold">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" placeholder="Cool Fit Guy" />
        </div>
      )}

      {step === 2 && (
        <div className="py-6 text-center">
          <h2 className="mb-1 text-2xl font-bold">Add a profile pic</h2>
          <p className="mb-6 text-sm text-muted-foreground">Show your face (optional).</p>
          <div className="mx-auto mb-6 flex justify-center">
            {pic || picUrl ? (
              <img src={pic || picUrl} alt="preview" className="h-32 w-32 rounded-full object-cover" />
            ) : (
              <UserAvatar user={{ username, display_name: displayName }} size={128} />
            )}
          </div>
          <input id="pic" type="file" accept="image/*" onChange={pickPic} className="hidden" />
          <Button variant="secondary" onClick={() => document.getElementById("pic").click()} className="mr-2 rounded-full">Choose photo</Button>
          <Button variant="ghost" onClick={next} className="rounded-full">Skip</Button>
        </div>
      )}

      {step === 3 && (
        <div className="py-6">
          <h2 className="mb-1 text-2xl font-bold">Write your bio</h2>
          <p className="mb-6 text-sm text-muted-foreground">Tell the community about your style.</p>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} rows={5} className="w-full resize-none rounded-xl border border-input bg-background p-3 outline-none focus:border-primary" placeholder="Streetwear obsessed in LA 🌴" />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/150</p>
        </div>
      )}

      {step === 4 && (
        <div className="py-6">
          <h2 className="mb-1 text-2xl font-bold">Pick your taste</h2>
          <p className="mb-4 text-sm text-muted-foreground">We'll tune your feed to these.</p>
          <label className="mb-2 block text-sm font-semibold">Favorite categories</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setFavCats((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${favCats.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{c}</button>
            ))}
          </div>
          <label className="mb-2 block text-sm font-semibold">Follow tags ({favTags.length}/8)</label>
          <div className="flex gap-1.5">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="streetwear" className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <Button size="sm" onClick={addTag} className="rounded-full">Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {favTags.map((t) => (
              <span key={t} onClick={() => setFavTags(favTags.filter((x) => x !== t))} className="cursor-pointer rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">#{t} ✕</span>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="py-6">
          <h2 className="mb-1 text-2xl font-bold">Follow some people</h2>
          <p className="mb-4 text-sm text-muted-foreground">Get the party started.</p>
          <div className="space-y-2">
            {suggested.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-2">
                <UserAvatar user={u} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">@{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.display_name}</p>
                </div>
                <FollowButton targetUser={u} />
              </div>
            ))}
            {suggested.length === 0 && <p className="text-sm text-muted-foreground">No users to suggest yet.</p>}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 text-6xl">🔥</span>
          <h1 className="mb-2 text-3xl font-black">You're in!</h1>
          <p className="mb-8 text-muted-foreground">Time to rate some fits.</p>
        </div>
      )}

      <div className="flex gap-2">
        {step > 0 && step < 6 && <Button variant="secondary" onClick={back} className="rounded-full">Back</Button>}
        {step < 6 && step !== 2 && (
          <Button onClick={next} disabled={step === 1 && !usernameOk} className="flex-1 rounded-full">Continue</Button>
        )}
        {step === 6 && <Button onClick={finish} disabled={saving} className="flex-1 rounded-full">{saving ? "Setting up…" : "Enter burger.ai"}</Button>}
      </div>
    </div>
  );
}