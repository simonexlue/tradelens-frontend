"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type ImageRec = {
  id?: string;
  s3_key: string;
  width?: number;
  height?: number;
  created_at?: string;
};

type Trade = {
  id: string;
  note: string | null;
  created_at: string;
  images: ImageRec[];
};

type Analysis = {
  what_happened: string;
  why_result: string;
  tips: string[];
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

async function fetchTrade(id: string): Promise<Trade> {
  const r = await fetch(`/api/trades/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text().catch(() => "Failed to fetch trade"));
  return r.json();
}

async function updateTradeNote(id: string, note: string): Promise<Trade> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!r.ok) throw new Error(await r.text().catch(() => "Failed to update note"));
  return r.json();
}

async function deleteTradeApi(id: string): Promise<void> {
  const r = await fetch(`/api/trades/${id}`, {
    method: "DELETE",
  });
  if(!r.ok) {
    throw new Error(await r.text().catch(()=> "Failed to delete trade"));
  }
}

async function runTradeAnalysisApi(
  tradeId: string,
  imageId: string
): Promise<Analysis> {
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

function TradeDetailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const tradeId = search.get("id") ?? undefined;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Note edits
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Image edit mode
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Trade delete
  const [deletingTrade, setDeletingTrade] = useState(false);

  // Lightbox
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // AI analysis
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const images = useMemo(() => trade?.images ?? [], [trade]);

  useEffect(() => {
    if (!tradeId) {
      setError("Missing trade id in query (?id=...)");
      return;
    }
    setError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setSelectedImageId(null);

    (async () => {
      try {
        setLoading(true);
        const data = await fetchTrade(tradeId);
        setTrade(data);

        // Auto-select first image if available
        if (data.images && data.images.length > 0 && data.images[0].id) {
          setSelectedImageId(data.images[0].id);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load trade");
      } finally {
        setLoading(false);
      }
    })();
  }, [tradeId]);

  async function saveNote() {
    if (!tradeId) return;
    try {
      setSaving(true);
      const updated = await updateTradeNote(tradeId, editedNote);
      setTrade(updated);
      setIsEditing(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error saving note");
    } finally {
      setSaving(false);
    }
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
    if (isEditingImages) return; // don't open lightbox in edit mode
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
    if(!tradeId) return;

    const confirmed = window.confirm(
      "Delete this trade and all associated screenshots and analysis? This cannot be undone"
    );
    if(!confirmed) return;

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
          <h1 className="text-2xl font-semibold text-slate-100">Trade Details</h1>
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
          {/* Note */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                Note
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditedNote(trade.note ?? "");
                      setIsEditing(true);
                    }}
                    className="text-slate-400 hover:text-teal-400"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </h2>

              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    disabled={saving}
                    className="text-teal-400 hover:text-teal-300"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 focus:border-teal-500 focus:outline-none"
              />
            ) : (
              <p className="text-slate-300">{trade.note?.trim() || "(no notes)"}</p>
            )}
          </section>

          {/* Images */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-slate-100">Images</h2>
                {!isEditingImages && images.length > 0 && (
                  <button
                    onClick={() => setIsEditingImages(true)}
                    className="text-slate-400 hover:text-teal-400"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>

                {isEditingImages && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingImages(false)}
                      className="text-teal-400 hover:text-teal-300"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setIsEditingImages(false)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-slate-400">
                No images yet. Use{" "}
                <span className="font-medium">&quot;Upload another image&quot;</span> to
                add screenshots.
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
                          isSelected
                            ? "border-teal-500 ring-2 ring-teal-500/60"
                            : "border-slate-800 hover:border-teal-500/40"
                        }`}
                    >
                      {/* Image area (click = preview only) */}
                      <button
                        type="button"
                        onClick={() => open(i)}
                        disabled={isEditingImages}
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
                      {isEditingImages && (
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

                      {/* AI selection footer bar (always at bottom) */}
                      {!isEditingImages && (
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

          {/* Analysis */}
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
                <span className="font-medium text-teal-300">Run AI Analysis</span> to
                generate:
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
                  <p className="mt-1 text-slate-200">{analysis.what_happened}</p>
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
