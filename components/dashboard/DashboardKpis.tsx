"use client"

import { useEffect, useState } from "react"
import { Info } from "lucide-react"
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
} from "@/components/ui/tooltip"

import type { DashboardKpis } from "@/types/dashboard"

type KpiCardProps = {
  label: string
  value: string
  subtitle?: string
  direction?: "up" | "down" | "flat"
}

function KpiCard({ label, value, subtitle, direction = "flat" }: KpiCardProps) {
  const valueColor =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
      ? "text-rose-400"
      : "text-slate-50"

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </span>

          {subtitle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  size={12}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs text-slate-200">{subtitle}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-2xl font-semibold ${valueColor}`}>
            {value}
          </span>
        </div>
      </div>
    </TooltipProvider>
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

        console.log("Dashboard KPI Response:", json)

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

  const { todayPnl, weekPnl, winRateLast30, profitFactor } = data

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

  const hasProfitFactor =
    typeof profitFactor === "number" && !Number.isNaN(profitFactor)

  return (
    <section className="mb-2">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Overview</h1>
        <p className="text-xs text-slate-400">
          P&amp;L and performance from your trading history
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
          label="This Week's P&L"
          value={formatUsd(weekPnl)}
          direction={weekPnl > 0 ? "up" : weekPnl < 0 ? "down" : "flat"}
        />

        {/* Overall Win Rate */}
        <KpiCard
          label="Win Rate (Overall)"
          value={formatPercent(winRateLast30)}
          subtitle="Win rate across all trades"
          direction={
            winRateLast30 > 0.5 ? "up" : winRateLast30 < 0.5 ? "down" : "flat"
          }
        />

        {/* Overall Profit Factor */}
        <KpiCard
          label="Profit Factor (Overall)"
          value={hasProfitFactor ? profitFactor.toFixed(2) : "0.00"}
          subtitle="> 1.0 = profitable"
          direction="flat"
        />
      </div>
    </section>
  )
}
