import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import UserAvatar from "@/components/UserAvatar";
import PostGrid from "@/components/PostGrid";
import CollectionCard from "@/components/CollectionCard";
import FollowButton from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Settings as SettingsIcon, Flag, Plus } from "lucide-react";
import BlockButton from "@/components/BlockButton";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [isMe, setIsMe] = useState(false);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [iBlocked, setIBlocked] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [tab, setTab] = useState("posts");
  const [collections, setCollections] = useState([]);
  const [coverPosts, setCoverPosts] = useState({});

  const load = async () => {
    try {
      const me = await base44.auth.me();
      let target = id === "me" ? me : await base44.entities.User.get(id);
      if (!target) { navigate("/"); return; }
      setUser(target);
      setIsMe(target.id === me.id);

      const userPosts = await base44.entities.Post.filter({ author_id: target.id }, "-created_date", 200);
      setPosts(userPosts);

      const fwers = await base44.entities.Follow.filter({ following_id: target.id }, "-created_date", 500);
      setFollowers(fwers.length);
      const fwing = await base44.entities.Follow.filter({ follower_id: target.id }, "-created_date", 500);
      setFollowing(fwing.length);

      // collections (own: all; others: public only)
      const cols = await base44.entities.Collection.filter({ user_id: target.id }, "-created_date", 200);
      const visCols = target.id === me.id ? cols : cols.filter((c) => c.is_public);
      setCollections(visCols);
      const coverIds = [...new Set(visCols.map((c) => c.cover_post_id).filter(Boolean))];
      if (coverIds.length) {
        const cps = [];
        for (let i = 0; i < coverIds.length; i += 50) {
          const chunk = coverIds.slice(i, i + 50);
          const ps = await base44.entities.Post.filter({ id: { $in: chunk } }, "-created_date", 50);
          cps.push(...ps);
        }
        setCoverPosts(Object.fromEntries(cps.map((p) => [p.id, p])));
      }

      if (target.id !== me.id) {
        const myBlock = await base44.entities.Block.filter({ blocker_id: me.id, blocked_id: target.id }, "-created_date", 1);
        const theirBlock = await base44.entities.Block.filter({ blocker_id: target.id, blocked_id: me.id }, "-created_date", 1);
        setIBlocked(myBlock.length > 0);
        setTheyBlockedMe(theirBlock.length > 0);
      }

      // log profile view (once per day, skip self)
      if (target.id !== me.id) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const existing = await base44.entities.ProfileView.filter({ viewer_id: me.id, viewed_user_id: target.id }, "-viewed_at", 50);
          const todayView = existing.find((v) => (v.viewed_at || "").slice(0, 10) === today);
          if (!todayView) {
            await base44.entities.ProfileView.create({ viewer_id: me.id, viewed_user_id: target.id, viewed_at: new Date().toISOString() });
          }
        } catch (e) {}
      }
    } catch (e) {
      toast({ title: "Profile not found", variant: "destructive" });
      navigate("/");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const report = async () => {
    const reason = prompt("Reason for reporting this profile?");
    if (!reason) return;
    try {
      const me = await base44.auth.me();
      await base44.entities.Report.create({ reporter_id: me.id, target_type: "user", target_id: user.id, reason });
      toast({ title: "Reported." });
    } catch (e) {}
  };

  const newCollection = async () => {
    const name = prompt("Collection name?");
    if (!name) return;
    try {
      const me = await base44.auth.me();
      const c = await base44.entities.Collection.create({ user_id: me.id, name: name.slice(0, 60), post_ids: [], is_public: false });
      setCollections((prev) => [c, ...prev]);
      setTab("collections");
      toast({ title: "Collection created" });
    } catch (e) {
      toast({ title: "Couldn't create", variant: "destructive" });
    }
  };

  if (!user) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;

  return (
    <div>
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-lg font-bold">@{user.username}</span>
        <div className="flex gap-3">
          {isMe ? (
            <Link to="/settings"><SettingsIcon size={22} /></Link>
          ) : (
            <div className="flex gap-3">
              <button onClick={report} className="text-muted-foreground"><Flag size={20} /></button>
              <BlockButton targetUser={user} onBlocked={() => setIBlocked(true)} />
            </div>
          )}
        </div>
      </header>

      <div className="px-4">
        <div className="flex items-start gap-4">
          <UserAvatar user={user} size={80} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{user.display_name || user.username}</h2>
              {user.is_pro && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-black text-accent-foreground">PRO</span>}
            </div>
            {user.bio && <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>}
          </div>
        </div>

        {!isMe && (iBlocked || theyBlockedMe) ? (
          <div className="mt-8 rounded-2xl border border-border bg-secondary p-6 text-center">
            <p className="text-sm font-semibold">
              {iBlocked ? `You blocked @${user.username}` : `@${user.username} blocked you`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {iBlocked ? "Unblock to see their fits." : "You can't see this account's fits."}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex justify-around text-center">
              <div><p className="text-lg font-bold">{posts.length}</p><p className="text-xs text-muted-foreground">Posts</p></div>
              <Link to={`/profile/${user.id}/followers`}><p className="text-lg font-bold">{followers}</p><p className="text-xs text-muted-foreground">Followers</p></Link>
              <Link to={`/profile/${user.id}/following`}><p className="text-lg font-bold">{following}</p><p className="text-xs text-muted-foreground">Following</p></Link>
            </div>

            <div className="mt-4">
              {isMe ? (
                <Button onClick={() => navigate("/edit-profile")} variant="secondary" className="w-full rounded-full">Edit profile</Button>
              ) : (
                <FollowButton targetUser={user} />
              )}
            </div>

            {isMe && (
              <div className="mt-3">
                <Button onClick={() => navigate("/who-viewed")} variant="outline" className="w-full rounded-full text-sm">
                  👀 Who viewed your profile
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {(!isMe && (iBlocked || theyBlockedMe)) ? null : (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2 border-b border-border">
            <button onClick={() => setTab("posts")} className={`px-4 py-2 text-sm font-bold ${tab === "posts" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>Posts</button>
            <button onClick={() => setTab("collections")} className={`px-4 py-2 text-sm font-bold ${tab === "collections" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>Collections</button>
            {isMe && tab === "collections" && (
              <button onClick={newCollection} className="ml-auto text-muted-foreground" title="New collection"><Plus size={20} /></button>
            )}
          </div>
          {tab === "posts" ? (
            <PostGrid posts={posts} emptyMessage="No fits posted yet" />
          ) : collections.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{isMe ? "No collections yet. Save a fit to start one." : "No collections."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {collections.map((c) => <CollectionCard key={c.id} collection={c} coverPost={coverPosts[c.cover_post_id]} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}