"use client"

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import type {
  ImageRec,
  Session,
  TradeAnalysis,
  TradeDetail,
  TradeOutcome,
  TradeSide,
  UpdateTradePayload,
} from "@/types/trades"
import { ImageLightbox } from "@/components/ui/ImageLightbox"
import { Button } from "@/components/ui/button"
import { TradeAnalysisSection } from "@/components/trades/TradeAnalysisSection"
import { TradeImagesSection } from "@/components/trades/TradeImageSection"
import { TradeMistakesSection } from "@/components/trades/TradeMistakesSection"
import { TradeNoteSection } from "@/components/trades/TradeNoteSection"
import { TradeOverviewSection } from "@/components/trades/TradeOverviewSection"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

type EditingSection = "overview" | "images" | "note" | "mistakes" | null
type SavingSection = "overview" | "note" | "mistakes" | null

function imgUrl(s3Key: string, q?: Record<string, string | number>) {
  const qs = q
    ? "?" +
      new URLSearchParams(
        Object.entries(q).map(([k, v]) => [k, String(v)])
      ).toString()
    : ""
  // encodeURI keeps slashes intact
  return `/api/images/${encodeURI(s3Key)}${qs}`
}

async function fetchTrade(id: string): Promise<TradeDetail> {
  const r = await fetch(`/api/trades/${id}`, { cache: "no-store" })
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed to fetch trade"))
  return r.json()
}

async function updateTrade(
  id: string,
  payload: UpdateTradePayload
): Promise<TradeDetail> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed to update trade"))
  return r.json()
}

async function deleteTradeApi(id: string): Promise<void> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "DELETE",
  })
  if (!r.ok) {
    throw new Error(await r.text().catch(() => "Failed to delete trade"))
  }
}

async function runTradeAnalysisApi(
  tradeId: string,
  imageId: string
): Promise<TradeAnalysis> {
  const r = await fetch(`/api/trades/${tradeId}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageId }),
  })

  if (!r.ok) {
    throw new Error(await r.text().catch(() => "Failed to run analysis"))
  }

  return r.json()
}

async function fetchStrategies(): Promise<string[]> {
  const r = await fetch(`/api/trades/strategies`, { cache: "no-store" })
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed to fetch strategies"))
  const data = await r.json()
  return data.strategies ?? []
}

function Fallback() {
  return (
    <div className="mx-4 md:mx-8 xl:mx-20 py-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-800" />
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-800" />
      </div>
    </div>
  )
}

// helper: convert ISO string to value acceptable by <input type="datetime-local">
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  // datetime-local uses "YYYY-MM-DDTHH:mm"
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function TradeDetailPage() {
  const router = useRouter()
  const search = useSearchParams()
  const tradeId = search.get("id") ?? undefined

  const [trade, setTrade] = useState<TradeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Section-level edit & save state
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [savingSection, setSavingSection] = useState<SavingSection>(null)

  const isOverviewEditing = editingSection === "overview"
  const isImagesEditing = editingSection === "images"
  const isNoteEditing = editingSection === "note"
  const isMistakesEditing = editingSection === "mistakes"

  // Drafts
  const [draftNote, setDraftNote] = useState<string>("")
  const [draftOutcome, setDraftOutcome] = useState<TradeOutcome | null>(null)
  const [draftStrategies, setDraftStrategies] = useState<string[]>([])
  const [draftMistakes, setDraftMistakes] = useState<string>("")
  const [draftSymbol, setDraftSymbol] = useState<string>("")

  const [draftTakenAt, setDraftTakenAt] = useState<string>("")
  const [draftExitAt, setDraftExitAt] = useState<string>("")
  // keep the original input-string versions so we know if user changed them
  const [originalTakenAtInput, setOriginalTakenAtInput] = useState<string>("")
  const [originalExitAtInput, setOriginalExitAtInput] = useState<string>("")

  const [draftSide, setDraftSide] = useState<TradeSide | null>(null)
  const [draftEntryPrice, setDraftEntryPrice] = useState<string>("")
  const [draftExitPrice, setDraftExitPrice] = useState<string>("")
  const [draftContracts, setDraftContracts] = useState<string>("")
  const [draftPnl, setDraftPnl] = useState<string>("")

  // Images
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)
  const [deletingTrade, setDeletingTrade] = useState(false)

  // Lightbox
  const [isOpen, setIsOpen] = useState(false)
  const [index, setIndex] = useState(0)

  // AI analysis
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Strategies list + input
  const [allStrategies, setAllStrategies] = useState<string[]>([])
  const [strategyInput, setStrategyInput] = useState<string>("")

  const images = useMemo(() => trade?.images ?? [], [trade])
  const lightboxImages = useMemo(
    () => images.map((img) => ({ s3Key: img.s3_key })),
    [images]
  )

  const effectiveStrategies =
    (trade?.strategies && trade.strategies.length > 0
      ? trade.strategies
      : draftStrategies) ?? []

  const filteredSuggestions = useMemo(() => {
    if (!strategyInput.trim()) return [] as string[]
    const needle = strategyInput.trim().toLowerCase()
    return allStrategies.filter(
      (s) =>
        s.toLowerCase().includes(needle) &&
        !draftStrategies.some((sel) => sel.toLowerCase() === s.toLowerCase())
    )
  }, [allStrategies, draftStrategies, strategyInput])

  function hydrateDrafts(from: TradeDetail) {
    setDraftNote(from.note ?? "")
    setDraftOutcome(from.outcome ?? null)
    setDraftStrategies(from.strategies ?? [])
    setDraftMistakes(
      from.mistakes && from.mistakes.length > 0 ? from.mistakes.join("\n") : ""
    )

    const takenInput = isoToLocalInput(from.taken_at ?? null)
    const exitInput = isoToLocalInput(from.exit_at ?? null)

    setDraftTakenAt(takenInput)
    setDraftExitAt(exitInput)

    // keep originals so we can detect whether user actually changed the times
    setOriginalTakenAtInput(takenInput)
    setOriginalExitAtInput(exitInput)

    setDraftSide(from.side ?? null)

    setDraftEntryPrice(
      from.entry_price != null ? from.entry_price.toString() : ""
    )
    setDraftExitPrice(from.exit_price != null ? from.exit_price.toString() : "")
    setDraftContracts(from.contracts != null ? from.contracts.toString() : "")
    setDraftPnl(from.pnl != null ? from.pnl.toString() : "")
    setDraftSymbol(from.symbol ?? "")
  }

  function handleAddStrategy(raw: string) {
    const s = raw.trim()
    if (!s) return
    // de-dupe case-insensitive
    const exists = draftStrategies.some(
      (t) => t.toLowerCase() === s.toLowerCase()
    )
    if (exists) {
      setStrategyInput("")
      return
    }
    setDraftStrategies((prev) => [...prev, s])
    setStrategyInput("")
  }

  function handleRemoveStrategy(tag: string) {
    setDraftStrategies((prev) =>
      prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
    )
  }

  function beginEditing(section: EditingSection) {
    if (!trade) return
    if (
      section === "overview" ||
      section === "note" ||
      section === "mistakes"
    ) {
      hydrateDrafts(trade)
    }
    setStrategyInput("")
    setEditingSection(section)
  }

  function cancelEditing() {
    if (trade) {
      hydrateDrafts(trade)
    }
    setStrategyInput("")
    setEditingSection(null)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const history = await fetchStrategies()
        setAllStrategies(history)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    if (!tradeId) {
      setError("Missing trade id in query (?id=...)")
      return
    }
    setError(null)
    setAnalysis(null)
    setAnalysisError(null)
    setSelectedImageId(null)
    setEditingSection(null)
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchTrade(tradeId)
        setTrade(data)
        hydrateDrafts(data)

        if (data.images && data.images.length > 0 && data.images[0].id) {
          setSelectedImageId(data.images[0].id)
          if (data.analysis) {
            setAnalysis({
              what_happened: data.analysis.what_happened,
              why_result: data.analysis.why_result,
              tips: data.analysis.tips ?? [],
              created_at: data.analysis.created_at,
            })
          }
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load trade")
      } finally {
        setLoading(false)
      }
    })()
  }, [tradeId])

  async function handleSaveOverview() {
    if (!tradeId) return

    let takenAtIso: string | null = null
    let exitAtIso: string | null = null

    // Only update takenAt if user actually changed the field
    if (draftTakenAt.trim() !== "" && draftTakenAt !== originalTakenAtInput) {
      takenAtIso = new Date(draftTakenAt).toISOString()
    }

    // Only update exitAt if user actually changed the field
    if (draftExitAt.trim() !== "" && draftExitAt !== originalExitAtInput) {
      exitAtIso = new Date(draftExitAt).toISOString()
    }

    const parseNumberField = (
      raw: string,
      label: string
    ): number | null | undefined => {
      if (raw.trim() === "") return null
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) {
        alert(`${label} must be a number`)
        throw new Error(`${label} must be a number`)
      }
      return parsed
    }

    let entryPriceValue: number | null | undefined
    let exitPriceValue: number | null | undefined
    let contractsValue: number | null | undefined
    let pnlValue: number | null | undefined

    try {
      entryPriceValue = parseNumberField(draftEntryPrice, "Entry price")
      exitPriceValue = parseNumberField(draftExitPrice, "Exit price")

      if (draftContracts.trim() === "") {
        contractsValue = null
      } else {
        const parsed = Number(draftContracts)
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          alert("Contracts must be an integer")
          return
        }
        contractsValue = parsed
      }

      pnlValue = parseNumberField(draftPnl, "PnL")
    } catch {
      return
    }

    try {
      setSavingSection("overview")
      const updated = await updateTrade(tradeId, {
        takenAt: takenAtIso,
        exitAt: exitAtIso,
        outcome: draftOutcome ?? null,
        strategies: draftStrategies,
        side: draftSide ?? null,
        entryPrice: entryPriceValue ?? null,
        exitPrice: exitPriceValue ?? null,
        contracts: contractsValue ?? null,
        pnl: pnlValue ?? null,
        symbol: draftSymbol.trim() || null,
      })
      setTrade(updated)
      hydrateDrafts(updated)
      setEditingSection(null)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error saving overview")
    } finally {
      setSavingSection(null)
    }
  }

  async function handleSaveNote() {
    if (!tradeId) return
    try {
      setSavingSection("note")
      const updated = await updateTrade(tradeId, {
        note: draftNote,
      })
      setTrade(updated)
      hydrateDrafts(updated)
      setEditingSection(null)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error saving note")
    } finally {
      setSavingSection(null)
    }
  }

  async function handleSaveMistakes() {
    if (!tradeId) return

    const mistakeArray =
      draftMistakes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean) ?? []

    try {
      setSavingSection("mistakes")
      const updated = await updateTrade(tradeId, {
        mistakes: mistakeArray,
      })
      setTrade(updated)
      hydrateDrafts(updated)
      setEditingSection(null)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error saving mistakes")
    } finally {
      setSavingSection(null)
    }
  }

  async function handleDeleteImage(image: ImageRec) {
    if (!tradeId) return
    if (!image.id) {
      alert("Cannot delete this image: missing image id from backend.")
      return
    }

    const confirmed = window.confirm("Delete this image from the trade?")
    if (!confirmed) return

    try {
      setDeletingImageId(image.id)
      const res = await fetch(`/api/trades/${tradeId}/images/${image.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error(await res.text().catch(() => "Failed to delete image"))
      }

      setTrade((prev) =>
        prev
          ? {
              ...prev,
              images: (prev.images ?? []).filter((img) => img.id !== image.id),
            }
          : prev
      )

      setSelectedImageId((prevSelected) =>
        prevSelected === image.id ? null : prevSelected
      )
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error deleting image")
    } finally {
      setDeletingImageId(null)
    }
  }

  const open = (i: number) => {
    setIndex(i)
    setIsOpen(true)
  }
  const close = () => setIsOpen(false)
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  async function handleRunAnalysis() {
    if (!tradeId) return
    if (!selectedImageId) {
      setAnalysisError("Select a screenshot above to analyze.")
      return
    }

    try {
      setAnalysisError(null)
      setAnalysisLoading(true)
      const result = await runTradeAnalysisApi(tradeId, selectedImageId)
      setAnalysis(result)
    } catch (e: any) {
      console.error(e)
      setAnalysisError(e?.message || "Failed to run analysis")
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function handleDeleteTrade() {
    if (!tradeId) return

    const confirmed = window.confirm(
      "Delete this trade and all associated screenshots and analysis? This cannot be undone"
    )
    if (!confirmed) return

    try {
      setDeletingTrade(true)
      await deleteTradeApi(tradeId)
      router.back()
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Failed to delete trade")
      setDeletingTrade(false)
    }
  }

  const thumbUrl = (s3Key: string) => imgUrl(s3Key, { fit: "thumb" })

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-slate-800 px-2 py-1 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-300"
          >
            ← Back
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteTrade}
            disabled={!tradeId || deletingTrade}
            className="border-red-500/60 text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            {deletingTrade ? "Deleting…" : "Delete trade"}
          </Button>
        </div>
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          Loading…
        </div>
      )}

      {/* Content */}
      {trade && !loading && (
        <div className="space-y-8">
          <TradeOverviewSection
            trade={trade}
            isEditing={isOverviewEditing}
            saving={savingSection === "overview"}
            onEdit={() => beginEditing("overview")}
            onCancel={cancelEditing}
            onSave={handleSaveOverview}
            draftTakenAt={draftTakenAt}
            setDraftTakenAt={setDraftTakenAt}
            draftExitAt={draftExitAt}
            setDraftExitAt={setDraftExitAt}
            draftEntryPrice={draftEntryPrice}
            setDraftEntryPrice={setDraftEntryPrice}
            draftExitPrice={draftExitPrice}
            setDraftExitPrice={setDraftExitPrice}
            draftContracts={draftContracts}
            setDraftContracts={setDraftContracts}
            draftPnl={draftPnl}
            setDraftPnl={setDraftPnl}
            draftSymbol={draftSymbol}
            setDraftSymbol={setDraftSymbol}
            draftOutcome={draftOutcome}
            setDraftOutcome={setDraftOutcome}
            draftSide={draftSide}
            setDraftSide={setDraftSide}
            draftStrategies={draftStrategies}
            setDraftStrategies={setDraftStrategies}
            strategyInput={strategyInput}
            setStrategyInput={setStrategyInput}
            filteredSuggestions={filteredSuggestions}
            effectiveStrategies={effectiveStrategies}
            onAddStrategy={handleAddStrategy}
            onRemoveStrategy={handleRemoveStrategy}
          />

          <TradeImagesSection
            tradeId={tradeId ?? null}
            images={images}
            isEditing={isImagesEditing}
            onEnterEdit={() => beginEditing("images")}
            onExitEdit={() => setEditingSection(null)}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            deletingImageId={deletingImageId}
            onDeleteImage={handleDeleteImage}
            openLightbox={open}
            getThumbUrl={thumbUrl}
          />

          <TradeNoteSection
            trade={trade}
            isEditing={isNoteEditing}
            saving={savingSection === "note"}
            onEdit={() => beginEditing("note")}
            onCancel={cancelEditing}
            onSave={handleSaveNote}
            draftNote={draftNote}
            setDraftNote={setDraftNote}
          />

          <TradeMistakesSection
            trade={trade}
            isEditing={isMistakesEditing}
            saving={savingSection === "mistakes"}
            onEdit={() => beginEditing("mistakes")}
            onCancel={cancelEditing}
            onSave={handleSaveMistakes}
            draftMistakes={draftMistakes}
            setDraftMistakes={setDraftMistakes}
          />

          <TradeAnalysisSection
            tradeId={tradeId ?? null}
            images={images}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            analysis={analysis}
            analysisError={analysisError}
            analysisLoading={analysisLoading}
            onRunAnalysis={handleRunAnalysis}
          />
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        index={index}
        isOpen={isOpen}
        onClose={close}
        onPrev={prev}
        onNext={next}
        srcBuilder={(s3Key) => imgUrl(s3Key, { w: 1920 })}
      />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <TradeDetailPage />
    </Suspense>
  )
}
