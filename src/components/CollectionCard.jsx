import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { Globe, Lock, LayoutGrid } from "lucide-react";

export default function CollectionCard({ collection, coverPost }) {
  return (
    <Link to={`/collection/${collection.id}`} className="block overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square w-full bg-muted">
        {coverPost ? (
          <Image src={coverPost.image_url} fittingType="fill" className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><LayoutGrid size={22} /></div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-bold">{collection.name}</p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{(collection.post_ids || []).length} fits</span>
          {collection.is_public ? <Globe size={12} /> : <Lock size={12} />}
        </div>
      </div>
    </Link>
  );
}