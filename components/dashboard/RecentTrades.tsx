"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import type { TradeListItem } from "@/types/trades"
import { Button } from "@/components/ui/button"

type PageResp = { items: TradeListItem[]; nextCursor: string | null }

async function fetchRecentTrades(limit = 12): Promise<TradeListItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) })

  const r = await fetch(`/api/trades?${qs.toString()}`, {
    cache: "no-store",
  })
  if (!r.ok) {
    throw new Error(await r.text().catch(() => "Failed loading trades"))
  }

  const data = (await r.json()) as PageResp
  return data.items
}

export function RecentTradesPanel() {
  const [items, setItems] = useState<TradeListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const trades = await fetchRecentTrades(12)
        setItems(trades)
      } catch (e: any) {
        setError(e?.message ?? "Failed loading trades")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatPnl = (pnl: number | null | undefined) => {
    if (pnl == null) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(pnl)
  }

  return (
    <section className="mt-4 flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">Trades</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Table header */}
      <div className="mb-2 grid grid-cols-[1.2fr_1.2fr_1fr] items-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>Symbol</span>
        <span>Close Date</span>
        <span className="text-right">Net P&amp;L</span>
      </div>

      {/* List body */}
      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/30">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            Loading recent trades…
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No trades yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {items.map((t) => {
              const symbol = t.symbol ?? "—"
              const pnl = t.pnl
              const date = formatDate(t.taken_at ?? t.created_at)

              const pnlClass =
                pnl == null || pnl === 0
                  ? "text-slate-100"
                  : pnl > 0
                  ? "text-emerald-400"
                  : "text-red-400"

              return (
                <Link
                  key={t.id}
                  href={`/trade-detail?id=${t.id}`}
                  className="grid grid-cols-[1.2fr_1.2fr_1fr] items-center px-3 py-2.5 text-xs text-slate-100 hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
                >
                  <span className="truncate text-slate-100">{symbol}</span>
                  <span className="truncate text-slate-300">{date}</span>
                  <span className={`truncate text-right ${pnlClass}`}>
                    {formatPnl(pnl)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* View all button */}
      <div className="mt-3">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          <Link href="/trades-list">View All</Link>
        </Button>
      </div>
    </section>
  )
}
