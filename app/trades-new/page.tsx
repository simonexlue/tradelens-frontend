"use client"

import * as React from "react"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

type CreateTradeResponse = { tradeId: string }
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

  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const dropRef = useRef<HTMLDivElement | null>(null)

  // trade metadata fields
  const [takenAt, setTakenAt] = useState("")
  const [exitAt, setExitAt] = useState("")
  const [outcome, setOutcome] = useState("")
  const [rMultiple, setRMultiple] = useState("")
  const [strategy, setStrategy] = useState("")
  const [mistakesText, setMistakesText] = useState("")
  const [side, setSide] = useState<"" | "buy" | "sell">("")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [contracts, setContracts] = useState("")
  const [pnl, setPnl] = useState("")

  const [strategyOptions, setStrategyOptions] = useState<string[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(true)

  const handleInput = (e: any) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

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
    const parsedR = rMultiple ? Number(rMultiple) : null
    if (rMultiple && !Number.isFinite(parsedR)) {
      throw new Error("R multiple must be a valid number")
    }

    const parsedEntry = entryPrice ? Number(entryPrice) : null
    if (entryPrice && !Number.isFinite(parsedEntry)) {
      throw new Error("Entry price must be a valid number")
    }

    const parsedExit = exitPrice ? Number(exitPrice) : null
    if (exitPrice && !Number.isFinite(parsedExit)) {
      throw new Error("Exit price must be a valid number")
    }

    const parsedContracts =
      contracts.trim() !== "" ? Number(contracts) : null;

    if (parsedContracts !== null) {
      if (!Number.isInteger(parsedContracts) || parsedContracts <= 0) {
        throw new Error("Contracts must be a positive integer");
      }
    }

    const parsedPnl = pnl ? Number(pnl) : null
    if (pnl && !Number.isFinite(parsedPnl)) {
      throw new Error("PnL must be a valid number")
    }

    // match CreateTradeBody in backend
    const payload = {
      note: note || "",
      takenAt: toIsoOrNull(takenAt),
      exitAt: toIsoOrNull(exitAt),
      outcome: outcome || null,
      rMultiple: parsedR,
      strategy: strategy || null,
      mistakes: parseMistakes(mistakesText),
      side: side || null,
      entryPrice: parsedEntry,
      exitPrice: parsedExit,
      contracts: parsedContracts,
      pnl: parsedPnl, 
    }

    const res = await fetch("/api/trades", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(`Create trade failed: ${j.detail ?? res.statusText}`)
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

  function validateAndSet(f: File | null) {
    if (!f) {
      setFile(null)
      return
    }
    if (!ALLOWED_MIME.has(f.type)) {
      setError("Unsupported file type. Allowed: PNG, JPG, WEBP.")
      setFile(null)
      return
    }
    if (f.size > MAX_BYTES) {
      setError("File too large. Max 10MB.")
      setFile(null)
      return
    }
    if (!extFromFilename(f.name)) {
      setError("File must have a valid image extension (png/jpg/jpeg/webp).")
      setFile(null)
      return
    }
    setFile(f)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const f = e.target.files?.[0] ?? null
    validateAndSet(f)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setError(null)
    const f = e.dataTransfer.files?.[0] ?? null
    validateAndSet(f)
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  async function handleUpload() {
    try {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      if (!file) {
        setError("Please choose an image first.")
        return
      }

      // Decide which tradeId to use
      let tradeId = existingTradeId || ""

      // If no existing tradeId, create a new trade
      if (!tradeId) {
        tradeId = await createTrade()
      }

      // Presign
      const { uploadUrl, key, contentType } = await presign(tradeId, file)

      const dims = await getImageDimensions(file)

      await putToS3(uploadUrl, contentType, file, (pct) => setProgress(pct))

      const imageResp = await saveImage(tradeId, key, file, dims)
      console.log("POST /images <-", imageResp)

      if (!imageResp?.imageId) {
        throw new Error("Image insert missing imageId (check backend logs)")
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

  const isAddImageMode = !!existingTradeId

  return (
    <div className="w-full">
      {error && (
        <div className="rounded-md bg-red-900/40 border border-red-700 p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* only show metadata + note input when creating a brand new trade */}
      {!isAddImageMode && (
        <div className="space-y-4">

          {/* Entry / Exit */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-200 text-sm">
                Entry time
              </label>
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
              <label className="text-slate-200 text-sm">
                Exit time
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                value={exitAt}
                onChange={(e) => setExitAt(e.target.value)}
              />
            </div>
          </div>

          {/* Outcome + R multiple */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-200 text-sm">Outcome</label>
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
            <div className="space-y-1">
              <label className="text-slate-200 text-sm">R multiple</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                placeholder="e.g. 1.5"
                value={rMultiple}
                onChange={(e) => setRMultiple(e.target.value)}
              />
            </div>
          </div>

          {/* Side (Position) + Contracts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-200 text-sm">Position</label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                value={side}
                onChange={(e) => setSide(e.target.value as "buy" | "sell" | "")}
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
          </div>

          {/* Entry / Exit price + PnL */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-slate-200 text-sm">Entry price</label>
              <input
                type="number"
                step="0.25"
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 outline-none"
                placeholder="e.g. 25193.50"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>

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
              Start typing to reuse a previous strategy or enter a new one.
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
            <label className="text-slate-200 text-sm">Note (optional)</label>
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
        className="mt-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300"
      >
        <p className="mb-4">
          {isAddImageMode
            ? "Drag & drop another chart screenshot for this trade"
            : "Drag & drop your chart screenshot here"}
        </p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="block mx-auto"
        />
        {file && (
          <div className="mt-4 text-sm text-slate-400">
            Selected: <span className="text-slate-200">{file.name}</span> (
            {Math.round(file.size / 1024)} KB)
          </div>
        )}
      </div>

      {/* Progress */}
      {isUploading && (
        <div className="w-full">
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
          disabled={isUploading || !file}
          className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 hover:opacity-95 disabled:opacity-50"
        >
          {isUploading
            ? "Uploading…"
            : isAddImageMode
            ? "Upload Image"
            : "Upload"}
        </button>
      </div>
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
