"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  TradeDetail,
  TradeAnalysis,
  ImageRec,
  TradeOutcome,
  TradeSide,
} from "@/types/trades";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type UpdateTradePayload = {
  note?: string;
  takenAt?: string | null;
  exitAt?: string | null;
  outcome?: TradeOutcome | null;
  rMultiple?: number | null;
  strategy?: string | null;
  mistakes?: string[];
  side?: TradeSide | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  contracts?: number | null;
  pnl?: number | null;
};

function imgUrl(s3Key: string, q?: Record<string, string | number>) {
  const qs = q
    ? "?" +
      new URLSearchParams(
        Object.entries(q).map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  // encodeURI keeps slashes intact
  return `/api/images/${encodeURI(s3Key)}${qs}`;
}

async function fetchTrade(id: string): Promise<TradeDetail> {
  const r = await fetch(`/api/trades/${id}`, { cache: "no-store" });
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed to fetch trade"));
  return r.json();
}

async function updateTrade(
  id: string,
  payload: UpdateTradePayload
): Promise<TradeDetail> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed to update trade"));
  return r.json();
}

async function deleteTradeApi(id: string): Promise<void> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "DELETE",
  });
  if (!r.ok) {
    throw new Error(await r.text().catch(() => "Failed to delete trade"));
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
  });

  if (!r.ok) {
    throw new Error(await r.text().catch(() => "Failed to run analysis"));
  }

  return r.json();
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
  );
}

// helper: convert ISO string to value acceptable by <input type="datetime-local">
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  // datetime-local uses "YYYY-MM-DDTHH:mm"
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function TradeDetailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const tradeId = search.get("id") ?? undefined;

  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Global edit mode for all sections (except AI analysis)
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drafts for fields while editing
  const [draftNote, setDraftNote] = useState<string>("");
  const [draftOutcome, setDraftOutcome] = useState<TradeOutcome | null>(null);
  const [draftRMultiple, setDraftRMultiple] = useState<string>("");
  const [draftStrategy, setDraftStrategy] = useState<string>("");
  const [draftMistakes, setDraftMistakes] = useState<string>("");

  // NEW: entry/exit times (datetime-local strings)
  const [draftTakenAt, setDraftTakenAt] = useState<string>("");
  const [draftExitAt, setDraftExitAt] = useState<string>("");

  // NEW: overview meta
  const [draftSide, setDraftSide] = useState<TradeSide | null>(null);
  const [draftEntryPrice, setDraftEntryPrice] = useState<string>("");
  const [draftExitPrice, setDraftExitPrice] = useState<string>("");
  const [draftContracts, setDraftContracts] = useState<string>("");
  const [draftPnl, setDraftPnl] = useState<string>("");

  // Image delete state
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Trade delete
  const [deletingTrade, setDeletingTrade] = useState(false);

  // Lightbox
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // AI analysis
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const images = useMemo(() => trade?.images ?? [], [trade]);

  // Initialize drafts from loaded trade
  function hydrateDrafts(from: TradeDetail) {
    setDraftNote(from.note ?? "");
    setDraftOutcome(from.outcome ?? null);
    setDraftRMultiple(
      from.r_multiple != null ? from.r_multiple.toString() : ""
    );
    setDraftStrategy(from.strategy ?? "");
    setDraftMistakes(
      from.mistakes && from.mistakes.length > 0
        ? from.mistakes.join("\n")
        : ""
    );
    setDraftTakenAt(isoToLocalInput(from.taken_at ?? null));
    setDraftExitAt(isoToLocalInput(from.exit_at ?? null));

    setDraftSide(from.side ?? null);

    setDraftEntryPrice(
      from.entry_price != null ? from.entry_price.toString() : ""
    );

    setDraftExitPrice(
      from.exit_price != null ? from.exit_price.toString() : ""
    );

    setDraftContracts(
      from.contracts != null ? from.contracts.toString() : ""
    );

    setDraftPnl(from.pnl != null ? from.pnl.toString() : "");
  }

  useEffect(() => {
    if (!tradeId) {
      setError("Missing trade id in query (?id=...)");
      return;
    }
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setSelectedImageId(null);
    setEditMode(false); // reset mode when switching trades

    (async () => {
      try {
        setLoading(true);
        const data = await fetchTrade(tradeId);
        setTrade(data);
        hydrateDrafts(data);

        // Auto-select first image if available
        if (data.images && data.images.length > 0 && data.images[0].id) {
          setSelectedImageId(data.images[0].id);

          if (data.analysis) {
            setAnalysis({
              what_happened: data.analysis.what_happened,
              why_result: data.analysis.why_result,
              tips: data.analysis.tips ?? [],
              created_at: data.analysis.created_at,
            });
          }
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load trade");
      } finally {
        setLoading(false);
      }
    })();
  }, [tradeId]);

  async function handleSaveAll() {
    if (!tradeId) return;

    // Parse R multiple
    let rMultipleValue: number | null = null;
    if (draftRMultiple.trim() !== "") {
      const parsed = Number(draftRMultiple);
      if (!Number.isFinite(parsed)) {
        alert("R multiple must be a number");
        return;
      }
      rMultipleValue = parsed;
    }

    // Parse mistakes from text area (one per line, ignore empty)
    const mistakeArray =
      draftMistakes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

    // Convert datetime-local -> ISO for backend (or null)
    const takenAtIso =
      draftTakenAt.trim() !== "" ? new Date(draftTakenAt).toISOString() : null;
    const exitAtIso =
      draftExitAt.trim() !== "" ? new Date(draftExitAt).toISOString() : null;

    // parse numeric meta
    const parseNumberField = (
      raw: string,
      label: string
    ): number | null | undefined => {
      if (raw.trim() === "") return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        alert(`${label} must be a number`);
        throw new Error(`${label} must be a number`);
      }
      return parsed;
    };

    let entryPriceValue: number | null | undefined;
    let exitPriceValue: number | null | undefined;
    let contractsValue: number | null | undefined;
    let pnlValue: number | null | undefined;

    try {
      entryPriceValue = parseNumberField(draftEntryPrice, "Entry price");
      exitPriceValue = parseNumberField(draftExitPrice, "Exit price");

      if (draftContracts.trim() === "") {
        contractsValue = null;
      } else {
        const parsed = Number(draftContracts);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          alert("Contracts must be an integer");
          return;
        }
        contractsValue = parsed;
      }

      pnlValue = parseNumberField(draftPnl, "PnL");
    } catch {
      // parseNumberField already alerted
      return;
    }

    try {
      setSaving(true);
      const updated = await updateTrade(tradeId, {
        note: draftNote,
        takenAt: takenAtIso,
        exitAt: exitAtIso,
        outcome: draftOutcome ?? null,
        rMultiple: rMultipleValue,
        strategy: draftStrategy.trim() || null,
        mistakes: mistakeArray,
        // NEW meta
        side: draftSide ?? null,
        entryPrice: entryPriceValue ?? null,
        exitPrice: exitPriceValue ?? null,
        contracts: contractsValue ?? null,
        pnl: pnlValue ?? null,
      });
      setTrade(updated);
      hydrateDrafts(updated);
      setEditMode(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error saving trade details");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelAll() {
    if (!trade) {
      setEditMode(false);
      return;
    }
    hydrateDrafts(trade);
    setEditMode(false);
  }

  async function handleDeleteImage(image: ImageRec) {
    if (!tradeId) return;

    if (!image.id) {
      alert("Cannot delete this image: missing image id from backend.");
      return;
    }

    const confirmed = window.confirm("Delete this image from the trade?");
    if (!confirmed) return;

    try {
      setDeletingImageId(image.id);
      const res = await fetch(`/api/trades/${tradeId}/images/${image.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text().catch(() => "Failed to delete image"));
      }

      setTrade((prev) =>
        prev
          ? {
              ...prev,
              images: (prev.images ?? []).filter((img) => img.id !== image.id),
            }
          : prev
      );

      // If we deleted the currently-selected image, clear or pick another
      setSelectedImageId((prevSelected) =>
        prevSelected === image.id ? null : prevSelected
      );
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error deleting image");
    } finally {
      setDeletingImageId(null);
    }
  }

  const open = (i: number) => {
    if (editMode) return; // don't open lightbox in edit mode
    setIndex(i);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  async function handleRunAnalysis() {
    if (!tradeId) return;
    if (!selectedImageId) {
      setAnalysisError("Select a screenshot above to analyze.");
      return;
    }

    try {
      setAnalysisError(null);
      setAnalysisLoading(true);
      const result = await runTradeAnalysisApi(tradeId, selectedImageId);
      setAnalysis(result);
    } catch (e: any) {
      console.error(e);
      setAnalysisError(e?.message || "Failed to run analysis");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleDeleteTrade() {
    if (!tradeId) return;

    const confirmed = window.confirm(
      "Delete this trade and all associated screenshots and analysis? This cannot be undone"
    );
    if (!confirmed) return;

    try {
      setDeletingTrade(true);
      await deleteTradeApi(tradeId);

      // After success
      router.push("/trades-list");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to delete trade");
      setDeletingTrade(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/trades-list")}
            className="rounded-2xl border border-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-300"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold text-slate-100">
            Trade Details
          </h1>

          {/* Main edit toggle beside title */}
          {trade && !loading && (
            <>
              {!editMode ? (
                <button
                  onClick={() => {
                    if (!trade) return;
                    hydrateDrafts(trade);
                    setEditMode(true);
                  }}
                  className="text-slate-400 hover:text-teal-400"
                  aria-label="Edit trade"
                >
                  <Pencil size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="text-teal-400 hover:text-teal-300 disabled:opacity-50"
                    aria-label="Save changes"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={handleCancelAll}
                    className="text-red-400 hover:text-red-300"
                    aria-label="Cancel editing"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              if (!tradeId || deletingTrade) return;
              router.push(`/trades-new?tradeId=${tradeId}`);
            }}
            disabled={!tradeId || deletingTrade}
            className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900 disabled:opacity-60"
          >
            Upload another image
          </Button>
          <Button
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
          {/* Overview + Timing (merged) */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-medium text-slate-100">
                Overview &amp; Timing
              </h2>
              {editMode && (
                <span className="rounded-full border border-teal-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
                  Editing
                </span>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 text-xs text-slate-400">
              {/* Left column: trade meta */}
              <div className="space-y-2">
                {/* Side + Contracts */}
                <div className="flex items-center justify-between gap-3">
                  <span>Side / Contracts:</span>
                  {editMode ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={draftSide ?? ""}
                        onChange={(e) =>
                          setDraftSide(
                            (e.target.value || null) as TradeSide | null
                          )
                        }
                        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">—</option>
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={draftContracts}
                        onChange={(e) => setDraftContracts(e.target.value)}
                        className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                        placeholder="#"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-200">
                      {trade.side ? trade.side.toUpperCase() : "—"}
                      {" · "}
                      {trade.contracts != null ? `${trade.contracts} ctr` : "—"}
                    </span>
                  )}
                </div>

                {/* Entry / Exit price */}
                <div className="flex items-center justify-between gap-3">
                  <span>Entry / Exit price:</span>
                  {editMode ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={draftEntryPrice}
                        onChange={(e) => setDraftEntryPrice(e.target.value)}
                        className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                        placeholder="Entry"
                      />
                      <span className="text-slate-500">→</span>
                      <input
                        type="number"
                        step="0.01"
                        value={draftExitPrice}
                        onChange={(e) => setDraftExitPrice(e.target.value)}
                        className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                        placeholder="Exit"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-200">
                      {trade.entry_price != null
                        ? trade.entry_price.toFixed(2)
                        : "—"}
                      {" → "}
                      {trade.exit_price != null
                        ? trade.exit_price.toFixed(2)
                        : "—"}
                    </span>
                  )}
                </div>

                {/* PnL */}
                <div className="flex items-center justify-between gap-3">
                  <span>PnL:</span>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={draftPnl}
                      onChange={(e) => setDraftPnl(e.target.value)}
                      className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                      placeholder="PnL ($)"
                    />
                  ) : (
                    <span
                      className={
                        trade.pnl != null && trade.pnl >= 0
                          ? "text-emerald-400"
                          : 
                          trade.pnl != null
                          ? "text-rose-400"
                          : "text-slate-200"
                      }
                    >
                      {trade.pnl != null
                        ? `$${trade.pnl.toFixed(2)}`
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Outcome */}
                <div className="flex items-center justify-between gap-3">
                  <span>Outcome:</span>
                  {editMode ? (
                    <select
                      value={draftOutcome ?? ""}
                      onChange={(e) =>
                        setDraftOutcome(
                          (e.target.value || null) as TradeOutcome | null
                        )
                      }
                      className="w-40 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">—</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="breakeven">Breakeven</option>
                      <option value="early_exit">Early exit</option>
                    </select>
                  ) : (
                    <span
                      className={
                        trade.outcome === "win"
                          ? "text-emerald-400"
                          : trade.outcome === "loss"
                          ? "text-rose-400"
                          : "text-slate-200"
                      }
                    >
                      {trade.outcome ?? "—"}
                    </span>
                  )}
                </div>

                {/* R multiple */}
                <div className="flex items-center justify-between gap-3">
                  <span>R multiple:</span>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={draftRMultiple}
                      onChange={(e) => setDraftRMultiple(e.target.value)}
                      className="w-24 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
                      placeholder="e.g. 1.50"
                    />
                  ) : (
                    <span
                      className={
                        trade.r_multiple != null && trade.r_multiple >= 0
                          ? "text-emerald-400"
                          : trade.r_multiple != null
                          ? "text-rose-400"
                          : "text-slate-200"
                      }
                    >
                      {trade.r_multiple != null
                        ? `${trade.r_multiple.toFixed(2)}R`
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Strategy */}
                <div className="flex items-center justify-between gap-3">
                  <span>Strategy:</span>
                  {editMode ? (
                    <input
                      type="text"
                      value={draftStrategy}
                      onChange={(e) => setDraftStrategy(e.target.value)}
                      className="w-40 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
                      placeholder="e.g. FVG, Liquidity Grab"
                    />
                  ) : (
                    <span className="text-slate-200">
                      {trade.strategy ?? "—"}
                    </span>
                  )}
                </div>

                {/* Session (read-only – inferred) */}
                <div className="flex items-center justify-between gap-3">
                  <span>Session:</span>
                  <span className="text-slate-200">{trade.session ?? "—"}</span>
                </div>
              </div>

              {/* Right column: timing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-medium">Timing</span>
                  {editMode && (
                    <span className="rounded-full border border-teal-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
                      Local time
                    </span>
                  )}
                </div>

                {/* Entry */}
                <div className="flex flex-col gap-1">
                  <span>Entry:</span>
                  {editMode ? (
                    <input
                      type="datetime-local"
                      value={draftTakenAt}
                      onChange={(e) => setDraftTakenAt(e.target.value)}
                      className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  ) : (
                    <span className="text-slate-200">
                      {trade.taken_at
                        ? new Date(trade.taken_at).toLocaleString()
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Exit */}
                <div className="flex flex-col gap-1">
                  <span>Exit:</span>
                  {editMode ? (
                    <input
                      type="datetime-local"
                      value={draftExitAt}
                      onChange={(e) => setDraftExitAt(e.target.value)}
                      className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  ) : (
                    <span className="text-slate-200">
                      {trade.exit_at
                        ? new Date(trade.exit_at).toLocaleString()
                        : "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-slate-100">Images</h2>
                {editMode && images.length > 0 && (
                  <span className="rounded-full border border-teal-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
                    Tap ✕ to remove
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-slate-400">
                No images yet. Use{" "}
                <span className="font-medium">
                  &quot;Upload another image&quot;
                </span>{" "}
                to add screenshots.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((img, i) => {
                  const isSelected = img.id && img.id === selectedImageId;

                  return (
                    <div
                      key={img.id ?? img.s3_key}
                      className={`relative flex flex-col rounded-2xl border bg-slate-950/40
                        ${
                          isSelected && !editMode
                            ? "border-teal-500 ring-2 ring-teal-500/60"
                            : "border-slate-800 hover:border-teal-500/40"
                        }`}
                    >
                      {/* Image area (click = preview only) */}
                      <button
                        type="button"
                        onClick={() => open(i)}
                        disabled={editMode}
                        className="flex-1 overflow-hidden rounded-t-2xl"
                      >
                        <img
                          src={imgUrl(img.s3_key, { fit: "thumb" })}
                          alt={`Screenshot ${i + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                        />
                      </button>

                      {/* Delete button in edit mode */}
                      {editMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(img);
                          }}
                          disabled={deletingImageId === img.id}
                          className="absolute right-3 top-3 rounded-full bg-red-900/80 px-2 py-1 text-xs text-red-100 hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingImageId === img.id ? "…" : "✕"}
                        </button>
                      )}

                      {/* AI selection footer bar (only when not editing) */}
                      {!editMode && (
                        <button
                          type="button"
                          onClick={() => img.id && setSelectedImageId(img.id)}
                          className={`w-full text-xs py-1.5 rounded-b-2xl font-medium border-t transition
                            ${
                              isSelected
                                ? "bg-teal-500 text-slate-900 border-teal-500"
                                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                            }`}
                        >
                          {isSelected ? "Selected for AI" : "Use for AI"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Note*/}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-medium text-slate-100">Note</h2>
              {editMode && (
                <span className="rounded-full border border-teal-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
                  Editing
                </span>
              )}
            </div>

            {editMode ? (
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 focus:border-teal-500 focus:outline-none"
                placeholder="What happened on this trade?"
              />
            ) : (
              <p className="text-slate-300">
                {trade.note?.trim() || "(no notes)"}
              </p>
            )}
          </section>

          {/* Mistakes */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-medium text-slate-100">Mistakes</h2>
              {editMode && (
                <span className="rounded-full border border-teal-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
                  Editing
                </span>
              )}
            </div>

            {editMode ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  One per line. These will be saved as individual mistakes.
                </p>
                <textarea
                  value={draftMistakes}
                  onChange={(e) => setDraftMistakes(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
                  placeholder={
                    "e.g.\nChased price into resistance\nIgnored 5m EMA context"
                  }
                />
              </div>
            ) : trade.mistakes && trade.mistakes.length > 0 ? (
              <ul className="mt-2 list-disc list-inside text-xs text-slate-300 space-y-1">
                {trade.mistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No mistakes logged yet. Toggle edit and add some for journaling.
              </p>
            )}
          </section>

          {/* Analysis (not affected by main edit mode) */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-100">Analysis</h2>
              <Button
                size="sm"
                onClick={handleRunAnalysis}
                disabled={
                  !tradeId ||
                  !selectedImageId ||
                  analysisLoading ||
                  images.length === 0
                }
                className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900 disabled:opacity-60"
              >
                {analysisLoading
                  ? "Analyzing…"
                  : selectedImageId
                  ? "Run AI Analysis"
                  : "Select a screenshot"}
              </Button>
            </div>

            {analysisError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
                {analysisError}
              </div>
            )}

            {analysisLoading && (
              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-sm text-slate-300">
                Analyzing this trade setup… This may take a few seconds.
              </div>
            )}

            {!analysis && !analysisLoading && (
              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-slate-400 text-sm">
                No analysis yet. Select a screenshot above and click{" "}
                <span className="font-medium text-teal-300">
                  Run AI Analysis
                </span>{" "}
                to generate:
                <ul className="mt-2 list-disc pl-5">
                  <li>What happened</li>
                  <li>Why it worked / failed</li>
                  <li>2–3 tips to improve next time</li>
                </ul>
              </div>
            )}

            {analysis && !analysisLoading && (
              <div className="space-y-4 text-sm text-slate-200">
                <div>
                  <h3 className="text-base font-semibold text-[#18B6B2]">
                    What happened
                  </h3>
                  <p className="mt-1 text-slate-200">
                    {analysis.what_happened}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#18B6B2]">
                    Why it worked / failed
                  </h3>
                  <p className="mt-1 text-slate-200">{analysis.why_result}</p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#18B6B2]">
                    Tips for next time
                  </h3>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {analysis.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Lightbox */}
      {isOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={close}
        >
          <div
            className="relative mx-4 w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imgUrl(images[index].s3_key, { w: 1920 })}
              alt={`Screenshot ${index + 1}`}
              className="max-h-[85vh] w-full object-contain"
            />
            <button
              onClick={close}
              className="absolute right-2 top-2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
              aria-label="Close"
            >
              x
            </button>

            {images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
                  aria-label="Previous"
                  onClick={prev}
                >
                  ‹
                </button>

                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-slate-200 hover:bg-slate-900"
                  aria-label="Next"
                >
                  ›
                </button>
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                  {index + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <TradeDetailPage />
    </Suspense>
  );
}
