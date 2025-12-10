import type { TradeSide } from "@/types/trades"

export type CsvSourceId = "tradovate" | "topstep" | "tradeify"

export type CsvTradeRow = {
  symbol: string
  side: TradeSide
  pnl: number
  entry_time?: string
  exit_time?: string
  entry_price?: number
  exit_price?: number
  contracts?: number
  duration?: number
}