"use client"

import { Pencil, X } from "lucide-react"
import type { ImageRec } from "@/types/trades"

import { ReactNode } from "react"

function OverviewTagPill({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[10px]",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  )
}

interface TradeImagesSectionProps {
  images: ImageRec[]
  isEditing: boolean // delete mode
  onEnterEdit: () => void
  onExitEdit: () => void
  selectedImageId: string | null
  setSelectedImageId: (id: string | null) => void
  deletingImageId: string | null
  onDeleteImage: (image: ImageRec) => void
  openLightbox: (index: number) => void
  getThumbUrl: (s3Key: string) => string
}

export function TradeImagesSection({
  images,
  isEditing,
  onEnterEdit,
  onExitEdit,
  selectedImageId,
  setSelectedImageId,
  deletingImageId,
  onDeleteImage,
  openLightbox,
  getThumbUrl,
}: TradeImagesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-slate-100">Images</h2>
          {isEditing && images.length > 0 && (
            <OverviewTagPill className="border-teal-500/40 text-teal-300">
              Tap ✕ to remove
            </OverviewTagPill>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
          {images.length > 0 && (
            <>
              {!isEditing ? (
                <button
                  onClick={onEnterEdit}
                  className="text-slate-400 hover:text-teal-400"
                  aria-label="Toggle image delete mode"
                >
                  <Pencil size={16} />
                </button>
              ) : (
                <button
                  onClick={onExitEdit}
                  className="text-red-400 hover:text-red-300"
                  aria-label="Exit image delete mode"
                >
                  <X size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-slate-400">
          No images yet. Use{" "}
          <span className="font-medium">&quot;Upload another image&quot;</span>{" "}
          to add screenshots.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img, i) => {
            const isSelected = img.id && img.id === selectedImageId

            return (
              <div
                key={img.id ?? img.s3_key}
                className={`relative flex flex-col rounded-2xl border bg-slate-950/40
                  ${
                    isSelected && !isEditing
                      ? "border-teal-500 ring-2 ring-teal-500/60"
                      : "border-slate-800 hover:border-teal-500/40"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(i)}
                  className="flex-1 overflow-hidden rounded-t-2xl"
                >
                  <img
                    src={getThumbUrl(img.s3_key)}
                    alt={`Screenshot ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                  />
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteImage(img)
                    }}
                    disabled={deletingImageId === img.id}
                    className="absolute right-3 top-3 rounded-full bg-red-900/80 px-2 py-1 text-xs text-red-100 hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingImageId === img.id ? "…" : "✕"}
                  </button>
                )}

                {!isEditing && (
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
            )
          })}
        </div>
      )}
    </section>
  )
}
