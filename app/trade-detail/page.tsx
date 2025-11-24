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

  // Lightbox
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const images = useMemo(() => trade?.images ?? [], [trade]);

  useEffect(() => {
    if (!tradeId) {
      setError("Missing trade id in query (?id=...)");
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await fetchTrade(tradeId);
        setTrade(data);
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

  return (
    <div className="mx-4 md:mx-8 xl:mx-20 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/trades-list')}
            className="rounded-2xl border border-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:border-teal-500/50 hover:text-teal-300"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold text-slate-100">Trade Details</h1>
        </div>

        <Button
          onClick={() => {
            if (!tradeId) return;
            router.push(`/trades-new?tradeId=${tradeId}`);
          }}
          className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900"
        >
          Upload another image
        </Button>
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
                {images.map((img, i) => (
                  <button
                    key={img.id ?? img.s3_key}
                    type="button"
                    onClick={() => open(i)}
                    className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40"
                  >
                    <img
                      src={imgUrl(img.s3_key, { fit: "thumb" })}
                      alt={`Screenshot ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-teal-500/0 group-hover:ring-2 group-hover:ring-teal-500/40" />

                    {isEditingImages && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img);
                        }}
                        disabled={deletingImageId === img.id}
                        className="absolute right-2 top-2 rounded-full bg-red-900/80 px-2 py-1 text-xs text-red-100 hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingImageId === img.id ? "…" : "✕"}
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Analysis */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-2 text-lg font-medium text-slate-100">Analysis</h2>
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-slate-400">
              No analysis yet. Waiting for AI integration.
              <ul className="mt-2 list-disc pl-5">
                <li>What happened</li>
                <li>Why it worked / failed</li>
                <li>2–3 tips to improve</li>
              </ul>
            </div>
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
