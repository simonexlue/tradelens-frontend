"use client";

import { TagPill } from "./TagPill";

interface ActiveFilterProps {
  pills: {
    key: string;
    label: string;
    onClick: () => void;
  }[];
}

export function ActiveFilters({ pills }: ActiveFilterProps) {
  if (pills.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {pills.map((p) => (
        <TagPill
          key={p.key}
          label={p.label}
          active
          onClick={p.onClick}
        />
      ))}
    </div>
  );
}
