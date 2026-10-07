import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Crown, Eye, TrendingUp, BadgeCheck, Check, Images } from "lucide-react";

export default function ProUpgrade() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setMe);
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") toast({ title: "Payment received — Pro activating! 👑" });
    if (params.get("status") === "cancel") toast({ title: "Checkout canceled.", variant: "destructive" });
  }, []);

  const subscribe = async () => {
    if (window.self !== window.top) {
      alert("Checkout works only from the published app. Open burger.ai in its own tab to subscribe.");
      return;
    }
    setProcessing(true);
    try {
      const res = await base44.functions.invoke("createCheckout", {});
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast({ title: res.data?.error || "Couldn't start checkout", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Couldn't subscribe", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const cancel = async () => {
    if (!confirm("Cancel Pro subscription?")) return;
    try {
      await base44.auth.updateMe({ is_pro: false });
      await base44.entities.Subscription.updateMany({ user_id: me.id, status: "active" }, { $set: { status: "canceled" } });
      const myPosts = await base44.entities.Post.filter({ author_id: me.id }, "-created_date", 200);
      if (myPosts.length) await base44.entities.Post.bulkUpdate(myPosts.map((p) => ({ id: p.id, is_boosted: false })));
      toast({ title: "Pro canceled." });
      setMe(await base44.auth.me());
    } catch (e) {}
  };

  const features = [
    { icon: Images, title: "Post up to 3 times a day", desc: "Free users get 1 post/day. Pro gets 3." },
    { icon: Eye, title: "See who viewed your profile", desc: "Full list with timestamps, plus 7 & 30 day counts." },
    { icon: TrendingUp, title: "Algorithm priority", desc: "Your posts get a 1.3x boost in the For You feed." },
    { icon: BadgeCheck, title: "Pro badge", desc: "A crown next to your name everywhere." },
  ];

  return (
    <div className="min-h-screen px-5 py-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Crown size={32} />
        </div>
        <h1 className="text-3xl font-black">burger.ai Pro</h1>
        <p className="text-muted-foreground">Level up your fit game.</p>
      </div>

      <div className="mb-6 space-y-3">
        {features.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-2xl border border-border p-4">
            <f.icon size={22} className="shrink-0 text-primary" />
            <div>
              <p className="font-bold">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl bg-secondary p-4 text-center">
        <p className="text-3xl font-black">$4.99<span className="text-base font-normal text-muted-foreground">/month</span></p>
      </div>

      <p className="mb-6 text-center text-xs text-muted-foreground">
        🔒 Note: Pro users can see who viewed their profile. Profile views are tracked for all users.
      </p>

      {me?.is_pro ? (
        <>
          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-accent/20 p-3 text-sm font-semibold text-accent-foreground">
            <Check size={18} /> You're a Pro member
          </div>
          <Button variant="secondary" onClick={cancel} className="w-full rounded-full">Cancel subscription</Button>
        </>
      ) : (
        <Button onClick={subscribe} disabled={processing} className="w-full rounded-full py-6 text-base font-bold">
          {processing ? "Processing…" : "Start Pro — $4.99/mo"}
        </Button>
      )}
      <p className="mt-3 text-center text-xs text-muted-foreground">Stripe test mode · no real charge</p>
    </div>
  );
}