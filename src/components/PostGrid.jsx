import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";

export default function PostGrid({ posts, emptyMessage = "No posts yet" }) {
  if (!posts.length) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => (
        <Link key={p.id} to={`/post/${p.id}`} className="relative aspect-[4/5] block bg-muted">
          <Image src={p.image_url} alt={p.caption || "outfit"} fittingType="fill" className="h-full w-full" />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
            {p.rating_count ? `${p.avg_score.toFixed(1)}` : "new"}
          </span>
        </Link>
      ))}
    </div>
  );
}