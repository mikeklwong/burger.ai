import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import UserAvatar from "./UserAvatar";
import RatingBar from "./RatingBar";
import { formatCount } from "@/lib/ratings";
import { Eye } from "lucide-react";

export default function PostCard({ post, author }) {
  return (
    <Link to={`/post/${post.id}`} className="block overflow-hidden rounded-2xl bg-card">
      <div className="relative aspect-[4/5] w-full bg-muted">
        <Image src={post.image_url} alt={post.caption || "outfit"} fittingType="fill" className="h-full w-full" />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {post.category}
        </span>
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          <Eye size={11} /> {formatCount(post.view_count)}
        </span>
      </div>
      <div className="p-3">
        {author && (
          <div className="mb-2 flex items-center gap-2">
            <UserAvatar user={author} size={24} />
            <span className="truncate text-xs font-semibold">@{author.username}</span>
            {author.is_pro && <span className="rounded bg-accent px-1 text-[9px] font-bold text-accent-foreground">PRO</span>}
          </div>
        )}
        {post.caption && <p className="mb-2 line-clamp-2 text-sm">{post.caption}</p>}
        <RatingBar counts={post} showLabels={false} />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{post.rating_count || 0} ratings</span>
          <span className="font-bold text-foreground">
            {post.rating_count ? `${post.avg_score.toFixed(2)}★` : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}