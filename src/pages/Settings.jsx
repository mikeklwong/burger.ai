import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";
import { Bell, UserCog, Crown, Shield, LogOut, Trash2, RotateCcw, Palette, Check, Ban } from "lucide-react";
import { THEMES, applyTheme, getStoredTheme } from "@/lib/themes";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [theme, setTheme] = useState("auto");

  useEffect(() => {
    (async () => {
      const m = await api.auth.me();
      setMe(m);
      setTheme(getStoredTheme());
    })();
  }, []);

  const pickTheme = (id) => {
    setTheme(id);
    applyTheme(id);
  };

  const logout = async () => {
    await api.auth.logout();
    navigate("/login");
  };

  const deleteAccount = async () => {
    if (!confirm("Permanently delete your account and all data? This cannot be undone.")) return;
    try {
      await api.auth.deleteAccount();
      toast({ title: "Account data deleted." });
      await logout();
    } catch (e) {
      toast({ title: "Couldn't delete", variant: "destructive" });
    }
  };

  const Row = ({ icon: Icon, label, onClick, danger = false }) => (
    <button onClick={onClick} className={`flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left ${danger ? "text-destructive" : ""}`}>
      <Icon size={20} /> <span className="flex-1 text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div>
      <header className="px-4 py-3">
        <h1 className="text-2xl font-black">Settings</h1>
      </header>
      <div className="px-4">
        <div className="overflow-hidden rounded-2xl border border-border">
          <Row icon={UserCog} label="Edit profile" onClick={() => navigate("/edit-profile")} />
          <Row icon={Crown} label="Free edition features" onClick={() => navigate("/pro")} />
          <Row icon={RotateCcw} label="Replay tutorial" onClick={() => navigate("/onboarding")} />
          <Row icon={Shield} label="Privacy & data" onClick={() => toast({ title: "Profile visits are visible to the profile owner." })} />
          <Row icon={Ban} label="Blocked accounts" onClick={() => navigate("/blocked")} />
          <Row icon={Bell} label="Notifications" onClick={() => navigate("/notifications")} />
          <Row icon={LogOut} label="Log out" onClick={logout} />
          <Row icon={Trash2} label="Delete account" onClick={deleteAccount} danger />
        </div>

        <div className="mt-6 mb-2 flex items-center gap-2 px-1">
          <Palette size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Theme</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => pickTheme("auto")}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold ${theme === "auto" ? "border-primary" : "border-border"}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white to-neutral-900 text-[10px]">Auto</span>
            <span>System</span>
          </button>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTheme(t.id)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold ${theme === t.id ? "border-primary" : "border-border"}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ background: t.swatch.bg, color: t.swatch.fg }}>
                <span className="h-3 w-3 rounded-full" style={{ background: t.swatch.fg }} />
              </span>
              <span className="text-center leading-tight">{t.label}</span>
              {theme === t.id && <Check size={14} className="absolute right-1.5 top-1.5 text-primary" />}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">burger.ai · rate fits, find your people</p>
      </div>
    </div>
  );
}