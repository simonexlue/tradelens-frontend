import Papa from "papaparse"
import type { CsvTradeRow } from "./types"
import type { TradeSide } from "@/types/trades"

function parseTradovatePnl(raw: any): number | null {
  if (raw == null) return null

  let s = String(raw).trim()
  if (!s) return null

  // Tradovate formats:
  //  "$7.50"
  //  "$(42.00)"
  let negative = false

  if (s.includes("(") && s.includes(")")) {
    negative = true
  }

  // strip $, commas, and parentheses
  s = s.replace(/[$,()]/g, "").trim()
  if (!s) return null

  const num = Number(s)
  if (!Number.isFinite(num)) return null

  return negative ? -num : num
}

function parseTradovateDuration(raw: any): number | undefined {
  if (raw == null) return undefined
  const s = String(raw).trim()
  if (!s) return undefined

  const m = s.match(/(\d+)min\s+(\d+)sec/)
  if (!m) return undefined

  const minutes = Number(m[1])
  const seconds = Number(m[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return undefined

  return minutes * 60 + seconds
}

function mapTradovateRow(raw: any): CsvTradeRow | null {
  const symbol = String(raw.symbol ?? "").trim()
  if (!symbol) return null

  const buyPrice = Number(raw.buyPrice)
  const sellPrice = Number(raw.sellPrice)
  if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice)) {
    return null
  }

  const side: TradeSide = buyPrice <= sellPrice ? "buy" : "sell"

  const pnlNum = parseTradovatePnl(raw.pnl)
  if (pnlNum === null) return null

  const contracts = raw.qty != null ? Number(raw.qty) : undefined
  const duration = parseTradovateDuration(raw.duration)

  const entry_time = raw.boughtTimestamp
    ? String(raw.boughtTimestamp).trim()
    : undefined

  const exit_time = raw.soldTimestamp
    ? String(raw.soldTimestamp).trim()
    : undefined

  const entry_price = Number.isFinite(Number(raw.buyPrice))
    ? Number(raw.buyPrice)
    : undefined

  const exit_price = Number.isFinite(Number(raw.sellPrice))
    ? Number(raw.sellPrice)
    : undefined

  return {
    symbol,
    side,
    pnl: pnlNum,
    entry_time,
    exit_time,
    entry_price,
    exit_price,
    contracts,
    duration,
  }
}

export function parseTradovateFile(file: File): Promise<CsvTradeRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete(results) {
        if (results.errors && results.errors.length > 0) {
          console.warn("Tradovate CSV parse errors:", results.errors)
        }

        const fields = results.meta.fields ?? []
        const required = [
          "symbol",
          "buyPrice",
          "sellPrice",
          "pnl",
          "boughtTimestamp",
          "soldTimestamp",
          "qty",
        ]

        for (const field of required) {
          if (!fields.includes(field)) {
            return reject(
              new Error(
                `This CSV doesn't look like a Tradovate export. Missing column "${field}".`,
              ),
            )
          }
        }

        const rawRows = results.data as any[]
        const rows: CsvTradeRow[] = []

        for (let i = 0; i < rawRows.length; i++) {
          const mapped = mapTradovateRow(rawRows[i])
          if (mapped) rows.push(mapped)
        }

        if (!rows.length) {
          return reject(
            new Error(
              "No valid rows found in CSV after Tradovate mapping.",
            ),
          )
        }

        resolve(rows)
      },
      error(err) {
        reject(err)
      },
    })
  })
}
