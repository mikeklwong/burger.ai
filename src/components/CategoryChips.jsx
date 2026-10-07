import React from "react";
import { CATEGORIES } from "@/lib/ratings";

export default function CategoryChips({ selected, onSelect, className = "" }) {
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar py-2 ${className}`}>
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
          selected === null ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            selected === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}