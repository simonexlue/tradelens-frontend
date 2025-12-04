"use client";

import React from "react";
import { TagPill } from "./TagPill";

interface FilterGroupProps<T extends string> {
  title: string;
  options: T[];
  activeValues: T[];
  onToggle: (value: T) => void;
  labelMap?: Record<T, string>;
}
export const FilterGroup = <T extends string>({
  title,
  options,
  activeValues,
  onToggle,
  labelMap,
}: FilterGroupProps<T>) => {
  if (!options || options.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = activeValues.includes(opt);
          const label = labelMap?.[opt] ?? opt;

          return (
            <TagPill
              key={opt}
              label={label}
              active={active}
              onClick={() => onToggle(opt)}
            />
          );
        })}
      </div>
    </div>
  );
};
