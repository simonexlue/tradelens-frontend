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

function toDateOrNull(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapTradovateRow(raw: any): CsvTradeRow | null {
  const symbol = String(raw.symbol ?? "").trim()
  if (!symbol) return null

  const contracts =
    raw.qty != null && raw.qty !== ""
      ? Number(raw.qty)
      : undefined

  if (contracts == null || !Number.isFinite(contracts) || contracts <= 0) {
    return null
  }

  const buyPrice = Number(raw.buyPrice)
  const sellPrice = Number(raw.sellPrice)
  if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice)) {
    return null
  }

  const pnlNum = parseTradovatePnl(raw.pnl)
  if (pnlNum === null) return null

  const duration = parseTradovateDuration(raw.duration)

  const buyTsStr = raw.boughtTimestamp
    ? String(raw.boughtTimestamp).trim()
    : ""

  const sellTsStr = raw.soldTimestamp
    ? String(raw.soldTimestamp).trim()
    : ""

  const buyDate = toDateOrNull(buyTsStr)
  const sellDate = toDateOrNull(sellTsStr)

  let entry_time: string | undefined
  let exit_time: string | undefined
  let entry_price: number | undefined
  let exit_price: number | undefined

  // Decide which timestamp is entry vs exit (earlier = entry)
  if (buyDate && sellDate) {
    if (buyDate <= sellDate) {
      // buy happens first -> long (normal case)
      entry_time = buyTsStr
      exit_time = sellTsStr
      entry_price = buyPrice
      exit_price = sellPrice
    } else {
      // sell happens first -> short (like your MNQZ5 example)
      entry_time = sellTsStr
      exit_time = buyTsStr
      entry_price = sellPrice
      exit_price = buyPrice
    }
  } else {
    // Fallback: keep original orientation if we can't parse dates
    entry_time = buyTsStr || undefined
    exit_time = sellTsStr || undefined
    entry_price = buyPrice
    exit_price = sellPrice
  }

  // Infer side from entry/exit price + pnl
  let side: TradeSide
  if (
    entry_price !== undefined &&
    exit_price !== undefined &&
    pnlNum !== 0
  ) {
    const priceDiff = exit_price - entry_price
    const pnlSign = pnlNum > 0 ? 1 : -1

    // If profit and price went up -> long (buy)
    // If profit and price went down -> short (sell)
    // If loss, the reverse.
    side = pnlSign * priceDiff >= 0 ? "buy" : "sell"
  } else {
    // Fallback #2: default to "buy"
    side = "buy"
  }

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
