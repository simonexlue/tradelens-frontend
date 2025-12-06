"use client"

import { Check, Pencil, X } from "lucide-react"
import type { TradeDetail } from "@/types/trades"
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea"

function OverviewTagPill({
  children,
  className = "",
}: {
  children: React.ReactNode
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

interface TradeMistakesSectionProps {
  trade: TradeDetail
  isEditing: boolean
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  draftMistakes: string
  setDraftMistakes: (v: string) => void
}

export function TradeMistakesSection({
  trade,
  isEditing,
  saving,
  onEdit,
  onCancel,
  onSave,
  draftMistakes,
  setDraftMistakes,
}: TradeMistakesSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-slate-100">Mistakes</h2>
          {isEditing && (
            <OverviewTagPill className="border-teal-500/40 text-teal-300">
              Editing
            </OverviewTagPill>
          )}
        </div>

        {!isEditing ? (
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-teal-400"
            aria-label="Edit mistakes"
          >
            <Pencil size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="text-teal-400 hover:text-teal-300 disabled:opacity-50"
              aria-label="Save mistakes"
            >
              <Check size={18} />
            </button>
            <button
              onClick={onCancel}
              className="text-red-400 hover:text-red-300"
              aria-label="Cancel editing mistakes"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-1">
          <p className="text-xs text-slate-400">
            One per line. These will be saved as individual mistakes.
          </p>
          <AutoResizeTextarea
            value={draftMistakes}
            onChange={(e) => setDraftMistakes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 focus:border-teal-500 focus:outline-none"
            placeholder={"Entered too early\nDidn’t wait for EMA alignment"}
          />
        </div>
      ) : trade.mistakes && trade.mistakes.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {trade.mistakes.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">
          No mistakes logged yet. Tap the pencil to add some for journaling.
        </p>
      )}
    </section>
  )
}
