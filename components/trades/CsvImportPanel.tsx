"use client"

import React, { useState } from "react"
import { Upload } from "lucide-react"

import { parseCsvForSource } from "@/lib/csvImport"
import type { CsvSourceId } from "@/lib/csvImport/types"
import { Button } from "@/components/ui/button"

type ImportResult = {
  insertedCount: number
  failedCount: number
}

export function CsvImportPanel() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvInfo, setCsvInfo] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [source, setSource] = useState<CsvSourceId>("tradovate")

  async function handleContinue() {
    if (!csvFile) return
    setCsvError(null)
    setCsvInfo(null)
    setIsBusy(true)

    try {
      const rows = await parseCsvForSource(source, csvFile)

      if (!rows.length) {
        setCsvError("No valid rows found in CSV.")
        return
      }

      const res = await fetch("/api/trades/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows }),
      })

      if (!res.ok) {
        let message = res.statusText
        try {
          const j = await res.json()
          if (j?.detail) {
            message =
              typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)
          } else {
            message = JSON.stringify(j)
          }
        } catch {
          // ignore parse errors, use statusText
        }
        throw new Error(`Import failed: ${message}`)
      }

      const data = (await res.json()) as ImportResult

      const importedPart = `Imported ${data.insertedCount} trade${
        data.insertedCount === 1 ? "" : "s"
      }`

      const skippedPart =
        data.failedCount > 0
          ? `Skipped ${data.failedCount} row${
              data.failedCount === 1 ? "" : "s"
            } as duplicates or failed validation`
          : ""

      setCsvInfo(
        skippedPart ? `${importedPart}. ${skippedPart}.` : `${importedPart}.`
      )
    } catch (err: any) {
      console.error(err)
      setCsvError(err?.message ?? "Failed to import trades from CSV.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div>
        <h2 className="text-lg font-medium text-slate-100">
          Import trades from CSV
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload a CSV file exported from your platform. Rows will be normalized
          into TradeLens format and imported.
        </p>
      </div>

      {/* Source selector */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
        <span className="text-slate-400">Source:</span>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="csv-source"
            value="tradovate"
            checked={source === "tradovate"}
            onChange={() => setSource("tradovate")}
            className="h-3 w-3 accent-teal-500"
          />
          <span>Tradovate Performance CSV</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="csv-source"
            value="topstep"
            checked={source === "topstep"}
            onChange={() => setSource("topstep")}
            className="h-3 w-3 accent-teal-500"
          />
          <span>Topstep Trades Export</span>
        </label>
      </div>

      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-slate-700 bg-slate-950/40 p-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            setCsvError(null)
            setCsvInfo(null)
            const f = e.target.files?.[0]
            if (!f) return
            setCsvFile(f)
          }}
          className="block w-full text-sm text-slate-300
                     file:mr-4 file:rounded-lg file:border-0 
                     file:bg-teal-600 file:px-4 file:py-2 file:text-slate-900
                     hover:file:bg-teal-500"
        />

        {csvFile && (
          <div className="text-xs text-slate-400">
            Selected: <span className="text-slate-200">{csvFile.name}</span>
          </div>
        )}

        {csvError && <div className="text-xs text-red-400">{csvError}</div>}

        {csvInfo && (
        <div className="text-xs text-teal-400">{csvInfo}</div>
        )}

        <Button
          disabled={!csvFile || isBusy}
          onClick={handleContinue}
          className="mt-2 bg-teal-500 text-slate-900 hover:bg-teal-400 disabled:opacity-50"
        >
          {isBusy ? "Importing..." : "Continue"}
        </Button>
      </div>
    </div>
  )
}
