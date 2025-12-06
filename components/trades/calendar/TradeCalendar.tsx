"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import type { CalendarDaySummary, CalendarResponse } from "@/types/calendar"
import type { FilterState } from "@/types/filters"
import { Button } from "@/components/ui/button"

type TradeCalendarProps = {
  filters: FilterState
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

async function fetchCalendar(
  year: number,
  month: number,
  filters: FilterState
): Promise<CalendarResponse> {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  })

  filters.outcomes.forEach((o) => qs.append("outcome", o))
  filters.sessions.forEach((s) => qs.append("session", s))
  filters.strategies.forEach((s) => qs.append("strategy", s))
  filters.symbols.forEach((s) => qs.append("symbol", s))

  const r = await fetch(`/api/trades/calendar?${qs.toString()}`, {
    cache: "no-store",
  })
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed loading calendar"))
  return r.json()
}

export function TradeCalendar({ filters }: TradeCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [days, setDays] = useState<CalendarDaySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch calendar whenever date filters change
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchCalendar(year, month + 1, filters)
        setDays(data.days ?? [])
      } catch (e: any) {
        setError(e?.message ?? "Failed loading calendar")
      } finally {
        setLoading(false)
      }
    })()
  }, [year, month, filters])

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDaySummary>()
    for (const d of days) {
      m.set(d.date, d)
    }
    return m
  }, [days])

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const firstWeekday = firstOfMonth.getDay() // 0 = sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result: { date: Date | null }[] = []

    for (let i = 0; i < firstWeekday; i++) {
      result.push({ date: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: new Date(year, month, d) })
    }
    while (result.length < 42) {
      result.push({ date: null })
    }

    return result
  }, [year, month])

  function goToPrevMonth() {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  function goToNextMonth() {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  function goToPrevYear() {
    setYear((y) => y - 1)
  }

  function goToNextYear() {
    setYear((y) => y + 1)
  }

  function goToToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-100">
            Trade Calendar
          </span>
          <span className="text-[11px] text-slate-400">
            Net P&amp;L and trade count per day
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-slate-950/60 px-3 py-1 text-xs">
            <button
              type="button"
              onClick={goToPrevYear}
              className="p-1 hover:text-teal-300"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1 hover:text-teal-300"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 text-xs font-medium text-slate-100">
              {MONTH_NAMES[month]} {year}
            </span>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:text-teal-300"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={goToNextYear}
              className="p-1 hover:text-teal-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-slate-600 bg-slate-950/60 text-xs text-slate-100 hover:border-teal-400 hover:text-teal-300"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex w-full justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Weekday header */}
          <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2 text-xs">
            {cells.map((cell, idx) => {
              if (!cell.date) {
                return (
                  <div
                    key={idx}
                    className="min-h-[80px] rounded-xl border border-slate-800 bg-slate-900/60"
                  />
                )
              }

              const d = cell.date
              const key = d.toISOString().slice(0, 10)
              const summary = dayMap.get(key)

              // Adjust property names if your /types/calendar.ts uses something different
              const pnl = summary?.pnl ?? 0
              const tradeCount =
                (summary as any)?.tradeCount ??
                (summary as any)?.trade_count ??
                0

              let bgClasses =
                "border-slate-800 bg-slate-900/60 hover:border-teal-400/60"
              if (tradeCount > 0 && pnl > 0) {
                bgClasses =
                  "border-emerald-500/40 bg-emerald-900/40 hover:border-emerald-300/70"
              } else if (tradeCount > 0 && pnl < 0) {
                bgClasses =
                  "border-red-500/40 bg-red-900/40 hover:border-red-300/70"
              } else if (tradeCount > 0 && pnl === 0) {
                bgClasses =
                  "border-slate-600/50 bg-slate-800/80 hover:border-teal-300/70"
              }

              return (
                <div
                  key={idx}
                  className={`flex min-h-[80px] flex-col justify-between rounded-xl border px-2 py-1 transition ${bgClasses}`}
                >
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{d.getDate()}</span>
                    {tradeCount > 0 && (
                      <span className="text-[10px] text-slate-300">
                        {tradeCount} trade{tradeCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {tradeCount > 0 && (
                    <div className="pb-1 text-xs font-semibold">
                      <span
                        className={
                          pnl > 0
                            ? "text-emerald-300"
                            : pnl < 0
                            ? "text-red-300"
                            : "text-slate-300"
                        }
                      >
                        {pnl > 0 ? "+" : ""}
                        {pnl.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
