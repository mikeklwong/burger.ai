import React from "react";
import { Image } from "@/components/ui/image";

export default function UserAvatar({ user, size = 40, className = "" }) {
  const dim = { width: size, height: size };
  if (user?.profile_picture) {
    return (
      <div className={`relative overflow-hidden rounded-full bg-muted ${className}`} style={dim}>
        <Image src={user.profile_picture} alt={user.username || "avatar"} fittingType="fill" className="h-full w-full" />
      </div>
    );
  }
  const initial = (user?.username || user?.display_name || "?").charAt(0).toUpperCase();
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold ${className}`}
      style={{ ...dim, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}