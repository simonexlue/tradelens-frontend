import Papa from "papaparse"
import type { CsvTradeRow } from "./types"
import { TradeSide } from "@/types/trades"

function parseTopstepDuration(raw: any): number | undefined {
    if (raw==null) return undefined
    const s = String(raw).trim()
    if (!s) return undefined

    // Topstep format: "00:35:58.674690"
    const [hms] = s.split(".") //drop fractional seconds
    const parts = hms.split(":")
    if(parts.length !== 3) return undefined

    const [hStr, mStr, sStr] = parts
    const h = Number(hStr)
    const m = Number(mStr)
    const sec = Number(sStr)

    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec)) return undefined
    
    return h * 3600 + m * 60 + sec
}

function mapTopstepRow(raw:any): CsvTradeRow | null {

    // Symbol : MNQ
    const symbol = String(raw.ContractName ?? "").trim()
    if(!symbol) return null

    // Position : Buy / Sell
    const typeRaw = String(raw.Type ?? "").trim().toLowerCase()
    let side: TradeSide | null = null
    if (typeRaw === "long") side = "buy"
    if (typeRaw === "short") side = "sell"
    if(!side) return null

    // PnL
    const pnlNum = Number(raw.PnL)
    if(!Number.isFinite(pnlNum)) return null

    // Entry/Exit times
    const entry_time = raw.EnteredAt
        ? String(raw.EnteredAt).trim()
        : undefined

    const exit_time = raw.ExitedAt
        ? String(raw.ExitedAt).trim()
        : undefined

    const entry_price = Number.isFinite(Number(raw.EntryPrice))
        ? Number(raw.EntryPrice)
        : undefined

    const exit_price = Number.isFinite(Number(raw.ExitPrice))
        ? Number(raw.ExitPrice)
        : undefined

    const contracts =
        raw.Size != null && Number.isFinite(Number(raw.Size))
        ? Number(raw.Size)
        : undefined

    const duration = parseTopstepDuration(raw.TradeDuration)

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

export function parseTopstepFile(file: File): Promise<CsvTradeRow[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete(results) {
                if (results.errors && results.errors.length > 0) {
                    console.warn("Topstep CSV parse errors:" , results.errors)
                }
                const fields = results.meta.fields ?? []

                const required = [
                    "ContractName",
                    "Type",
                    "PnL",
                    "EnteredAt",
                    "ExitedAt",
                    "Size",
                    "EntryPrice",
                    "ExitPrice",
                ]

                for(const field of required) {
                    if(!fields.includes(field)) {
                        return reject(
                            new Error(
                                `This CSV doesn't look like a Topstep export. Missing column ${field}`
                            )
                        )
                    }
                }

                const rawRows = results.data as any[]
                const rows: CsvTradeRow[] = []

                for(let i = 0; i < rawRows.length; i++) {
                    const mapped = mapTopstepRow(rawRows[i])
                    if(mapped) rows.push(mapped)
                }
                if(!rows.length) {
                    return reject(
                        new Error(
                            "No valid rows found in CSV after Topstep mapping."
                        )
                    )
                }
                resolve(rows)
            },
            error(err) {
                reject(err)
            }
        })
    })
}