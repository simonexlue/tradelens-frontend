import type { CsvSourceId, CsvTradeRow } from "./types"
import { parseTradovateFile } from "./tradovate"
import { parseTopstepFile } from "./topstep"

export async function parseCsvForSource(
  source: CsvSourceId,
  file: File,
): Promise<CsvTradeRow[]> {
  switch (source) {
    case "tradovate":
      return parseTradovateFile(file)
    case "topstep":
      return parseTopstepFile(file)
    // case "tradeify":
    //   return parseTradeifyFile(file)
    default:
      throw new Error(`Unsupported CSV source: ${source}`)
  }
}