"use client"

import React, { useRef, useState } from "react"
import { Upload } from "lucide-react"

import { parseCsvForSource } from "@/lib/csvImport"
import type { CsvSourceId } from "@/lib/csvImport/types"
import { Button } from "@/components/ui/button"

type ImportResult = {
  insertedCount: number
  failedCount: number
  skippedCount: number
}

type CsvImportPanelProps = {
  selectedAccountId: string | null
}

export function CsvImportPanel({ selectedAccountId }: CsvImportPanelProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvInfo, setCsvInfo] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [source, setSource] = useState<CsvSourceId>("tradovate")
  const dropRef = useRef<HTMLDivElement | null>(null)

  function setFileFromInput(f: File | null) {
    setCsvError(null)
    setCsvInfo(null)
    if (!f) return
    setCsvFile(f)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] ?? null
    setFileFromInput(f)
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId, rows }),
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
        } catch {}
        throw new Error(`Import failed: ${message}`)
      }

      const data = (await res.json()) as ImportResult

      const parts: string[] = []
      parts.push(
        `Imported ${data.insertedCount} trade${
          data.insertedCount === 1 ? "" : "s"
        }`
      )
      if (data.skippedCount > 0) {
        parts.push(
          `Skipped ${data.skippedCount} duplicate row${
            data.skippedCount === 1 ? "" : "s"
          }`
        )
      }
      if (data.failedCount > 0) {
        parts.push(
          `Failed to import ${data.failedCount} row${
            data.failedCount === 1 ? "" : "s"
          } due to validation errors`
        )
      }

      setCsvInfo(parts.join(". ") + ".")
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
          Upload a CSV file exported from your platform. Duplicates will be
          skipped.
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
          <span>Tradovate</span>
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
          <span>Topstep</span>
        </label>
      </div>

      {/* Drag & drop zone */}
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="mt-2 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/40 px-8 py-8 text-center text-slate-300"
      >
        <Upload className="h-8 w-8 text-slate-500" aria-hidden="true" />

        <p className="text-sm font-medium">Drag & drop your CSV file here</p>
        <p className="text-xs text-slate-500">
          Supported: Tradovate Performance CSV or Topstep Trades Export
        </p>

        {/* hidden real input */}
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={(e) => setFileFromInput(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <label
            htmlFor="csv-file-input"
            className="inline-flex cursor-pointer items-center rounded-lg bg-slate-100/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Choose file
          </label>

          <Button
            disabled={!csvFile || isBusy}
            onClick={handleContinue}
            className="inline-flex items-center gap-2 bg-teal-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-teal-400 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isBusy ? "Importing…" : "Continue"}
          </Button>
        </div>

        {csvFile && (
          <div className="mt-3 text-xs text-slate-400">
            Selected: <span className="text-slate-200">{csvFile.name}</span>
          </div>
        )}

        {csvError && (
          <div className="mt-1 text-xs text-red-400">{csvError}</div>
        )}

        {csvInfo && <div className="mt-1 text-xs text-teal-400">{csvInfo}</div>}
      </div>
    </div>
  )
}
