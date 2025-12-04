"use client";

import React from "react";

interface TagPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function TagPill({ label, active = false, onClick }: TagPillProps) {
  const base =
    "rounded-full px-3 py-1 border text-xs transition cursor-pointer select-none";

  const activeStyles =
    "border-teal-500 bg-teal-500/20 text-teal-200";
  const inactiveStyles =
    "border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/60";

  return (
    <button onClick={onClick} className={`${base} ${active ? activeStyles : inactiveStyles}`}>
      {label}
    </button>
  );
}
