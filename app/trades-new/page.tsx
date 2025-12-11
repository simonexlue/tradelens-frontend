"use client"

import * as React from "react"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Upload } from "lucide-react"
import Papa from "papaparse"

import { CreateTradePayload, TradeOutcome, TradeSide } from "@/types/trades"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountSelect } from "@/components/accounts/AccountSelect"
import { CsvImportPanel } from "@/components/trades/CsvImportPanel"

type CreateTradeResponse = {
  tradeId: string
}

type PresignResponse = {
  uploadUrl: string
  key: string
  expiresIn: number
  contentType: "image/png" | "image/jpeg" | "image/webp"
  contentLengthRange: { min: number; max: number }
}

type CreateImageResponse = {
  imageId: string
  s3Key: string
  createdAt: string
}

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"])
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

function NewTradePageInner() {
  const router = useRouter()
  const search = useSearchParams()

  // If tradeid exists, "add image to existing trade" mode
  const existingTradeId = search.get("tradeId")

  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const dropRef = useRef<HTMLDivElement | null>(null)

  // trade metadata fields
  const [takenAt, setTakenAt] = useState("")
  const [exitAt, setExitAt] = useState("")
  const [outcome, setOutcome] = useState("")
  const [strategy, setStrategy] = useState("")
  const [mistakesText, setMistakesText] = useState("")
  const [side, setSide] = useState<"" | "buy" | "sell">("")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [contracts, setContracts] = useState("")
  const [pnl, setPnl] = useState("")
  const [symbol, setSymbol] = useState("")

  const [strategyOptions, setStrategyOptions] = useState<string[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(true)

  const [mode, setMode] = useState<"manual" | "csv">("manual")

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  )

  const handleInput = (e: any) => {
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  function toIsoOrNull(value: string): string | null {
    if (!value) return null
    const d = new Date(value)
    return d.toISOString()
  }

  function parseMistakes(text: string): string[] | null {
    if (!text.trim()) return null
    const parts = text
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    return parts.length ? parts : null
  }

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/trades/strategies", { cache: "no-store" })
        if (!r.ok) throw new Error()
        const json = await r.json()
        setStrategyOptions(json.strategies ?? [])
      } catch {
        // non-fatal, just no suggestions
      } finally {
        setLoadingStrategies(false)
      }
    })()
  }, [])

  function extFromFilename(name: string) {
    const m = name.toLowerCase().match(/\.(png|jpe?g|webp)$/i)
    if (!m) return null
    return (m[1] as any) === "jpeg" ? "jpeg" : (m[1] as any)
  }

  async function getImageDimensions(
    f: File
  ): Promise<{ width?: number; height?: number }> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(f)
        const img = new Image()
        img.onload = () => {
          const res = { width: img.width, height: img.height }
          URL.revokeObjectURL(url)
          resolve(res)
        }
        img.onerror = () => resolve({})
        img.src = url
      } catch {
        resolve({})
      }
    })
  }

  async function createTrade(): Promise<string> {
    const parsedEntry = entryPrice ? Number(entryPrice) : undefined
    if (entryPrice && !Number.isFinite(parsedEntry)) {
      throw new Error("Entry price must be a valid number")
    }

    const parsedExit = exitPrice ? Number(exitPrice) : undefined
    if (exitPrice && !Number.isFinite(parsedExit)) {
      throw new Error("Exit price must be a valid number")
    }

    const parsedContracts =
      contracts.trim() !== "" ? Number(contracts) : undefined

    if (parsedContracts !== undefined) {
      if (!Number.isInteger(parsedContracts) || parsedContracts <= 0) {
        throw new Error("Contracts must be a positive integer")
      }
    }

    const parsedPnl = pnl ? Number(pnl) : undefined
    if (pnl && !Number.isFinite(parsedPnl)) {
      throw new Error("PnL must be a valid number")
    }

    const trimmedSymbol = symbol.trim()

    const strategies = strategy.trim() !== "" ? [strategy.trim()] : undefined

    const parsedMistakes = parseMistakes(mistakesText) ?? undefined

    const payload: CreateTradePayload = {
      note: note || undefined,
      takenAt: toIsoOrNull(takenAt),
      exitAt: toIsoOrNull(exitAt),
      outcome: (outcome || undefined) as TradeOutcome | undefined,
      strategies,
      mistakes: parsedMistakes,
      side: (side || undefined) as TradeSide | undefined,
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      contracts: parsedContracts,
      pnl: parsedPnl,
      symbol: trimmedSymbol || undefined,
      accountId: selectedAccountId ?? undefined,
    }

    const res = await fetch("/api/trades", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let message = res.statusText
      try {
        const j = await res.json()
        console.error("Create trade error body:", j)

        if (j?.detail) {
          message =
            typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)
        } else {
          message = JSON.stringify(j)
        }
      } catch {}

      throw new Error(`Create trade failed: ${message}`)
    }

    const data = (await res.json()) as CreateTradeResponse
    return data.tradeId
  }

  async function presign(tradeId: string, f: File): Promise<PresignResponse> {
    const extRaw = extFromFilename(f.name)
    const ext: "png" | "jpg" | "jpeg" | "webp" =
      extRaw === "jpeg" ? "jpeg" : (extRaw as any)

    const body = {
      contentType: f.type as PresignResponse["contentType"],
      fileExt: ext,
      size: f.size,
      tradeId,
    }

    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(`Presign failed: ${j.detail ?? res.statusText}`)
    }

    return (await res.json()) as PresignResponse
  }

  function putToS3(
    url: string,
    contentType: string,
    f: File,
    onProgress: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable)
          onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else {
          console.error("S3 error body:", xhr.responseText)
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      }
      xhr.onerror = () => reject(new Error("Network error during S3 upload"))
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", contentType)
      xhr.send(f)
    })
  }

  async function saveImage(
    tradeId: string,
    key: string,
    f: File,
    dims: { width?: number; height?: number }
  ): Promise<CreateImageResponse> {
    const res = await fetch(`/api/trades/${tradeId}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        contentType: f.type,
        width: dims.width,
        height: dims.height,
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      console.error("saveImage failed:", res.status, text)
      let detail: string | undefined
      try {
        detail = JSON.parse(text)?.detail
      } catch {}
      throw new Error(`Save image failed: ${detail ?? res.statusText}`)
    }
    return JSON.parse(text) as CreateImageResponse
  }

  function validateAndCollect(selected: FileList | null) {
    if (!selected?.length) return

    const next: File[] = []
    for (const f of Array.from(selected)) {
      if (!ALLOWED_MIME.has(f.type)) {
        setError("Unsupported file type. Allowed: PNG, JPG, WEBP.")
        continue
      }
      if (f.size > MAX_BYTES) {
        setError("File too large. Max 10MB.")
        continue
      }
      if (!extFromFilename(f.name)) {
        setError("File must have a valid image extension (png/jpg/jpeg/webp).")
        continue
      }
      next.push(f)
    }

    if (next.length === 0) return
    setFiles((prev) => [...prev, ...next])
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    validateAndCollect(e.target.files)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setError(null)
    validateAndCollect(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  const isAddImageMode = !!existingTradeId

  function validateRequiredFields(): string | null {
    if (!outcome) {
      return "Outcome is required"
    }
    if (!side) {
      return "Position is required"
    }
    if (!symbol.trim()) {
      return "Symbol is required"
    }

    return null
  }

  const requiredError = !isAddImageMode ? validateRequiredFields() : null
  const isSaveDisabled =
    isUploading ||
    (isAddImageMode && files.length === 0) ||
    (!isAddImageMode && !!requiredError)

  async function handleUpload() {
    try {
      setError(null)

      setIsUploading(true)
      setProgress(0)

      // Validate "no image" flows in add-image mode
      if (isAddImageMode && files.length === 0) {
        setError("Please choose at least one image to upload.")
        return
      }

      // Decide which tradeId to use
      let tradeId = existingTradeId || ""

      // If no existing tradeId, create a new trade (even if no images)
      if (!tradeId) {
        tradeId = await createTrade()
      }

      // Upload all selected images (if any)
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          const { uploadUrl, key, contentType } = await presign(tradeId, f)
          const dims = await getImageDimensions(f)

          await putToS3(uploadUrl, contentType, f, (pct) => {
            // Convert per-file progress into overall 0–100%
            const overall = Math.round(((i + pct / 100) / files.length) * 100)
            setProgress(overall)
          })

          const imageResp = await saveImage(tradeId, key, f, dims)
          console.log("POST /images <-", imageResp)

          if (!imageResp?.imageId) {
            throw new Error("Image insert missing imageId (check backend logs)")
          }
        }
      } else {
        // No images: just mark 100% so progress looks complete
        setProgress(100)
      }

      // Navigate back to detail of this trade
      router.push(`/trade-detail?id=${tradeId}`)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? "Something went wrong")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-red-900/40 border border-red-700 p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Only show account selection when creating a new trade */}
      {!isAddImageMode && (
        <AccountSelect
          value={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      )}

      {isAddImageMode ? (
        <>
          {/* only show metadata + note input when creating a brand new trade */}

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="mt-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 px-8 py-10
             flex flex-col items-center justify-center text-center text-slate-300 gap-3"
          >
            <Upload className="h-8 w-8 text-slate-500" aria-hidden="true" />

            <p className="text-sm font-medium">
              {isAddImageMode
                ? "Drag & drop chart screenshots for this trade"
                : "Drag & drop your chart screenshots here"}
            </p>

            <p className="text-xs text-slate-500">
              PNG, JPG or WEBP • Max 10MB each
            </p>

            {/* Hidden real input */}
            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={onPick}
              className="hidden"
            />

            {/* Pretty button that triggers the input */}
            <label
              htmlFor="file-input"
              className="mt-2 inline-flex items-center rounded-lg bg-slate-100/90 px-4 py-2
               text-sm font-medium text-slate-900 shadow-sm cursor-pointer
               hover:bg-white focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-teal-500 focus-visible:ring-offset-2
               focus-visible:ring-offset-slate-900"
            >
              Choose files
            </label>

            {files.length > 0 && (
              <div className="mt-4 w-full max-w-md text-left text-sm text-slate-400">
                <div className="mb-1">
                  Selected {files.length} file{files.length !== 1 ? "s" : ""}:
                </div>
                <ul className="max-h-32 overflow-y-auto text-xs text-slate-300">
                  {files.map((f, idx) => (
                    <li key={`${f.name}-${idx}`}>
                      {f.name} ({Math.round(f.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="w-full mt-4">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-teal-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-400">{progress}%</div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isSaveDisabled}
              className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 hover:opacity-95 disabled:opacity-50"
            >
              {isUploading
                ? "Uploading…"
                : isAddImageMode
                ? "Upload Image(s)"
                : "Save Trade"}
            </button>
          </div>
        </>
      ) : (
        <Tabs
          value={mode}
          onValueChange={(val) => setMode(val as "manual" | "csv")}
          className="w-full"
        >
          <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">CSV Import</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            {/* only show metadata + note input when creating a brand new trade */}
            {!isAddImageMode && (
              <div className="space-y-4">
                {/* Entry / Exit */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">Entry time</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      value={takenAt}
                      onChange={(e) => setTakenAt(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      Used to auto-detect session (London / NY / Break / Asian).
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">Exit time</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      value={exitAt}
                      onChange={(e) => setExitAt(e.target.value)}
                    />
                  </div>
                </div>

                {/* Outcome */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">
                      Outcome <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                    >
                      <option value="">Select outcome</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="breakeven">Breakeven</option>
                      <option value="early_exit">Early exit</option>
                    </select>
                  </div>
                </div>

                {/* Side (Position) + Contracts + Symbol */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      value={side}
                      onChange={(e) =>
                        setSide(e.target.value as "buy" | "sell" | "")
                      }
                    >
                      <option value="">Select position</option>
                      <option value="buy">Buy (long)</option>
                      <option value="sell">Sell (short)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">Contracts</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      placeholder="e.g. 3"
                      value={contracts}
                      onChange={(e) => setContracts(e.target.value)}
                    />
                  </div>

                  {/* Symbol */}
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">
                      Symbol <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      placeholder="e.g. MNQH5"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    />
                  </div>
                </div>

                {/* Entry / Exit price + PnL */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">
                      Entry price
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      placeholder="e.g. 25193.50"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                    />
                  </div>

                  {/* Exit price */}
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">Exit price</label>
                    <input
                      type="number"
                      step="0.25"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      placeholder="e.g. 25173.50"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                    />
                  </div>

                  {/* PnL */}
                  <div className="space-y-1">
                    <label className="text-slate-200 text-sm">PnL ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                      placeholder="e.g. -100"
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                    />
                  </div>
                </div>

                {/* Strategy */}
                <div className="space-y-1">
                  <label className="text-slate-200 text-sm">
                    Strategy{" "}
                    {loadingStrategies && (
                      <span className="text-xs text-slate-500">(loading…)</span>
                    )}
                  </label>
                  <input
                    list="strategy-options"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                    placeholder="FVG, Liquidity Grab, VWAP…"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <datalist id="strategy-options">
                    {strategyOptions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500">
                    Start typing to reuse a previous strategy or enter a new
                    one.
                  </p>
                </div>

                {/* Mistakes */}
                <div className="space-y-1">
                  <label className="text-slate-200 text-sm">
                    Mistakes (optional)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none text-sm"
                    placeholder="e.g. Entered late, Ignored HTF trend"
                    value={mistakesText}
                    onInput={handleInput}
                    onChange={(e) => setMistakesText(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Separate with commas, semicolons, or new lines.
                  </p>
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-slate-200 text-sm">
                    Note (optional)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none"
                    rows={3}
                    placeholder="What happened on this trade?"
                    value={note}
                    onInput={handleInput}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="mt-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 px-8 py-10
             flex flex-col items-center justify-center text-center text-slate-300 gap-3"
            >
              <Upload className="h-8 w-8 text-slate-500" aria-hidden="true" />

              <p className="text-sm font-medium">
                {isAddImageMode
                  ? "Drag & drop chart screenshots for this trade"
                  : "Drag & drop your chart screenshots here"}
              </p>

              <p className="text-xs text-slate-500">
                PNG, JPG or WEBP • Max 10MB each
              </p>

              {/* Hidden real input */}
              <input
                id="file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={onPick}
                className="hidden"
              />

              <label
                htmlFor="file-input"
                className="mt-2 inline-flex items-center rounded-lg bg-slate-100/90 px-4 py-2
               text-sm font-medium text-slate-900 shadow-sm cursor-pointer
               hover:bg-white focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-teal-500 focus-visible:ring-offset-2
               focus-visible:ring-offset-slate-900"
              >
                Choose files
              </label>

              {files.length > 0 && (
                <div className="mt-4 w-full max-w-md text-left text-sm text-slate-400">
                  <div className="mb-1">
                    Selected {files.length} file{files.length !== 1 ? "s" : ""}:
                  </div>
                  <ul className="max-h-32 overflow-y-auto text-xs text-slate-300">
                    {files.map((f, idx) => (
                      <li key={`${f.name}-${idx}`}>
                        {f.name} ({Math.round(f.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Progress */}
            {isUploading && (
              <div className="w-full mt-4">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-teal-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-400">{progress}%</div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isSaveDisabled}
                className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 hover:opacity-95 disabled:opacity-50"
              >
                {isUploading
                  ? "Uploading…"
                  : isAddImageMode
                  ? "Upload Image(s)"
                  : "Save Trade"}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="csv">
            <CsvImportPanel selectedAccountId={selectedAccountId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default function NewTradePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl p-6 text-slate-300">Loading…</div>
      }
    >
      <NewTradePageInner />
    </Suspense>
  )
}
