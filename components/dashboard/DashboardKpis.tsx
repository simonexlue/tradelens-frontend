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

  const valueColor =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
      ? "text-rose-400"
      : "text-slate-50"

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${valueColor}`}>{value}</span>

        {subtitle && (
          <span className={`text-xs`}>{subtitle}</span>
        )}
      </div>
    </div>
  )
}

export function DashboardKpis() {
  const [data, setData] = useState<DashboardKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/trades/stats", { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Failed to load KPIs: ${res.status}`)
        }

        const json = (await res.json()) as DashboardKpis
        if (!isMounted) return
        setData(json)
      } catch (e: any) {
        console.error(e)
        if (isMounted) setError(e?.message ?? "Failed to load dashboard stats")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60"
          />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
        {error ?? "No KPI data available"}
      </div>
    )
  }

  const { todayPnl, weekPnl, winRateLast30, avgPnlLast30 } = data

  const formatUsd = (n: number) =>
    (n < 0 ? "-$" : "$") +
    Math.abs(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const formatPercent = (n: number) =>
    (n * 100).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    }) + "%"

  return (
    <section className="mb-2">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Overview</h1>
        <p className="text-xs text-slate-400">
          P&amp;L and performance from your recent trades
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's PNL */}
        <KpiCard
          label="Today's P&L"
          value={formatUsd(todayPnl)}
          direction={todayPnl > 0 ? "up" : todayPnl < 0 ? "down" : "flat"}
        />

        {/* Week's PNL */}
        <KpiCard
          label="This week's P&L"
          value={formatUsd(weekPnl)}
          direction={weekPnl > 0 ? "up" : weekPnl < 0 ? "down" : "flat"}
        />

        <KpiCard
          label="Win Rate (Last 30)"
          value={formatPercent(winRateLast30)}
          subtitle="of last 30 trades"
          direction={winRateLast30 > 0.5 ? "up" : winRateLast30 < 0.5 ? "down" : "flat"}
        />

        <KpiCard
          label="Avg R (Last 30)"
          value={avgPnlLast30.toFixed(2)}
          subtitle="per trade"
          direction="flat"
        />
      </div>
    </section>
  )
}
