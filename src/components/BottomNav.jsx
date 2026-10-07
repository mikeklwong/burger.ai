import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, Plus, Bell, User as UserIcon } from "lucide-react";
import { api } from "@/api/client";

export default function BottomNav() {
  const navigate = useNavigate();
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await api.auth.me();
        if (!me) return;
        const n = await api.entities.Notification.filter({ user_id: me.id, read: false }, "-created_date", 50);
        if (active) setUnread(n.length);
      } catch (e) {}
    })();
    return () => { active = false; };
  }, []);

  const itemClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${isActive ? "text-primary" : "text-muted-foreground"}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-end px-2">
        <NavLink to="/" end className={itemClass}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/explore" className={itemClass}>
          <Compass size={22} />
          <span>Explore</span>
        </NavLink>
        <button
          aria-label="Upload an outfit"
          onClick={() => navigate("/upload")}
          className="flex flex-1 flex-col items-center justify-center"
        >
          <span className="flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-90">
            <Plus size={26} />
          </span>
        </button>
        <NavLink to="/notifications" className={itemClass}>
          <div className="relative">
            <Bell size={22} />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <span>Activity</span>
        </NavLink>
        <NavLink to="/profile/me" className={itemClass}>
          <UserIcon size={22} />
          <span>Profile</span>
        </NavLink>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}