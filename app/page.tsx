"use client"

import { FilterState } from "@/types/filters"
import { TradeCalendar } from "@/components/dashboard/TradeCalendar"
import { RecentTradesPanel } from "@/components/dashboard/RecentTrades"

const EMPTY_FILTERS: FilterState = {
  outcomes: [],
  sessions: [],
  strategies: [],
  symbols: [],
}

export default function DashboardPage() {
  const filters = EMPTY_FILTERS

  return (
    <main className="w-full">
      {/* TWO-COLUMN LAYOUT */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
        <RecentTradesPanel />
        <TradeCalendar filters={filters} />
      </div>
    </main>
  )
}