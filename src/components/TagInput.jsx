import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeTag } from "@/lib/ratings";
import { X } from "lucide-react";

export default function TagInput({ tags, onChange, max = 8 }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const posts = await base44.entities.Post.list("-created_date", 200);
        const counts = {};
        posts.forEach((p) => (p.tags || []).forEach((t) => { const nt = normalizeTag(t); if (nt) counts[nt] = (counts[nt] || 0) + 1; }));
        setAllTags(counts);
      } catch (e) {}
    })();
  }, []);

  const addTag = (raw) => {
    const t = normalizeTag(raw);
    if (!t || tags.includes(t) || tags.length >= max) return;
    onChange([...tags, t]);
    setInput("");
    setSuggestions([]);
  };

  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  const onType = (val) => {
    setInput(val);
    const prefix = normalizeTag(val);
    if (!prefix) return setSuggestions([]);
    const matches = Object.entries(allTags)
      .filter(([t]) => t.includes(prefix) && !tags.includes(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t, count]) => ({ tag: t, count }));
    setSuggestions(matches);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background p-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
            #{t}
            <button onClick={() => removeTag(t)} className="text-muted-foreground"><X size={12} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); } }}
          placeholder={tags.length < max ? "Add tag…" : "Max tags"}
          disabled={tags.length >= max}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s.tag} onClick={() => addTag(s.tag)} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              #{s.tag} <span className="opacity-60">{s.count}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">{tags.length}/{max} tags</p>
    </div>
  );
}