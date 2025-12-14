"use client"

import { useEffect, useState } from "react"

import type { DashboardKpis } from "@/types/dashboard"

type KpiCardProps = {
  label: string
  value: string
  subtitle?: string
  direction?: "up" | "down" | "flat"
}

function KpiCard({ label, value, subtitle, direction = "flat" }: KpiCardProps) {
  const directionColor =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
      ? "text-rose-400"
      : "text-slate-400"

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-50">{value}</span>
        {subtitle ? (
          <span className={`text-xs ${directionColor}`}>{subtitle}</span>
        ) : null}
      </div>
    </div>
  )
}
