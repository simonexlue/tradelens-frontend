"use client"

import type { ReactNode } from "react"
import { Check, Pencil, X } from "lucide-react"

import type {
  TradeDetail,
  TradeOutcome,
  TradeSide,
  Session,
} from "@/types/trades"

const OUTCOME_LABELS: Record<TradeOutcome, string> = {
  win: "Win",
  loss: "Loss",
  breakeven: "Break Even",
  early_exit: "Early Exit",
}

const SESSION_LABELS: Record<Session, string> = {
  London: "London",
  NY: "New York",
  Break: "Break",
  Asia: "Asia",
}

const SIDE_LABELS: Record<TradeSide, string> = {
  buy: "Long",
  sell: "Short",
}

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

interface TradeOverviewSectionProps {
  trade: TradeDetail
  isEditing: boolean
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void

  draftTakenAt: string
  setDraftTakenAt: (v: string) => void
  draftExitAt: string
  setDraftExitAt: (v: string) => void

  draftEntryPrice: string
  setDraftEntryPrice: (v: string) => void
  draftExitPrice: string
  setDraftExitPrice: (v: string) => void
  draftContracts: string
  setDraftContracts: (v: string) => void
  draftPnl: string
  setDraftPnl: (v: string) => void

  draftSymbol: string
  setDraftSymbol: (v: string) => void

  draftOutcome: TradeOutcome | null
  setDraftOutcome: (v: TradeOutcome | null) => void

  draftSide: TradeSide | null
  setDraftSide: (v: TradeSide | null) => void

  draftStrategies: string[]
  setDraftStrategies: (v: string[]) => void

  strategyInput: string
  setStrategyInput: (v: string) => void
  filteredSuggestions: string[]
  effectiveStrategies: string[]

  onAddStrategy: (value: string) => void
  onRemoveStrategy: (tag: string) => void
}

export function TradeOverviewSection({
  trade,
  isEditing,
  saving,
  onEdit,
  onCancel,
  onSave,
  draftTakenAt,
  setDraftTakenAt,
  draftExitAt,
  setDraftExitAt,
  draftEntryPrice,
  setDraftEntryPrice,
  draftExitPrice,
  setDraftExitPrice,
  draftContracts,
  setDraftContracts,
  draftPnl,
  setDraftPnl,
  draftSymbol,
  setDraftSymbol,
  draftOutcome,
  setDraftOutcome,
  draftSide,
  setDraftSide,
  draftStrategies,
  setDraftStrategies,
  strategyInput,
  setStrategyInput,
  filteredSuggestions,
  effectiveStrategies,
  onAddStrategy,
  onRemoveStrategy,
}: TradeOverviewSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      {/* Header row with title + per-section edit controls */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-slate-100">Overview</h2>
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
            aria-label="Edit overview"
          >
            <Pencil size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="text-teal-400 hover:text-teal-300 disabled:opacity-50"
              aria-label="Save overview"
            >
              <Check size={18} />
            </button>
            <button
              onClick={onCancel}
              className="text-red-400 hover:text-red-300"
              aria-label="Cancel editing overview"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Tag row: symbol / outcome / session / side / strategies */}
      {!isEditing && (
        <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
          {/* Symbol pill */}
          {trade.symbol && trade.symbol.trim() !== "" && (
            <OverviewTagPill className="border-amber-500/60 bg-amber-500/10 text-amber-200">
              {trade.symbol}
            </OverviewTagPill>
          )}

          {/* Outcome pill */}
          {trade.outcome && (
            <OverviewTagPill
              className={
                trade.outcome === "win"
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                  : trade.outcome === "loss"
                  ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                  : "border-slate-600 bg-slate-800/80 text-slate-200"
              }
            >
              {OUTCOME_LABELS[trade.outcome]}
            </OverviewTagPill>
          )}

          {/* Session pill */}
          {trade.session && (
            <OverviewTagPill className="border-slate-600 bg-slate-800/80 text-slate-200">
              {SESSION_LABELS[trade.session]}
            </OverviewTagPill>
          )}

          {/* Side pill */}
          {trade.side && (
            <OverviewTagPill className="border-sky-500/60 bg-sky-500/15 text-sky-200">
              {SIDE_LABELS[trade.side]}
            </OverviewTagPill>
          )}

          {/* Strategy pills */}
          {effectiveStrategies.length > 0 &&
            effectiveStrategies.map((s) => (
              <OverviewTagPill
                key={s}
                className="max-w-[14rem] truncate border-teal-500/60 bg-teal-500/10 text-teal-200"
              >
                {s}
              </OverviewTagPill>
            ))}
        </div>
      )}

      {/* Timing */}
      <div className="mb-4 space-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {isEditing && (
            <OverviewTagPill className="border-teal-500/40 text-teal-300">
              Local time
            </OverviewTagPill>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={draftTakenAt}
              onChange={(e) => setDraftTakenAt(e.target.value)}
              className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
            />
            <span className="text-slate-500">→</span>
            <input
              type="datetime-local"
              value={draftExitAt}
              onChange={(e) => setDraftExitAt(e.target.value)}
              className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>
        ) : (
          <span className="text-slate-200">
            {trade.taken_at ? new Date(trade.taken_at).toLocaleString() : "—"}
            {" → "}
            {trade.exit_at ? new Date(trade.exit_at).toLocaleString() : "—"}
          </span>
        )}
      </div>

      {/* Meta grid */}
      <div className="grid gap-6 md:grid-cols-2 text-xs text-slate-400">
        {/* Left column: entry/exit, contracts, PnL */}
        <div className="space-y-2">
          {/* Entry / Exit price */}
          <div className="flex items-center justify-between gap-3">
            <span>Entry / Exit price:</span>
            {isEditing ? (
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
                {trade.entry_price != null ? trade.entry_price.toFixed(2) : "—"}
                {" → "}
                {trade.exit_price != null ? trade.exit_price.toFixed(2) : "—"}
              </span>
            )}
          </div>

          {/* Contracts */}
          <div className="flex items-center justify-between gap-3">
            <span>Contracts:</span>
            {isEditing ? (
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
                  <option value="">Side —</option>
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
                {trade.contracts != null ? `${trade.contracts} contracts` : "—"}
              </span>
            )}
          </div>

          {/* PnL */}
          <div className="flex items-center justify-between gap-3">
            <span>PnL:</span>
            {isEditing ? (
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
                    : trade.pnl != null
                    ? "text-rose-400"
                    : "text-slate-200"
                }
              >
                {trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : "—"}
              </span>
            )}
          </div>
        </div>

        {/* Right column: symbol, session, side, outcome (edit) */}
        <div className="space-y-2">
          {/* Symbol */}
          <div className="flex items-center justify-between gap-3">
            <span>Symbol:</span>
            {isEditing ? (
              <input
                type="text"
                value={draftSymbol}
                onChange={(e) => setDraftSymbol(e.target.value.toUpperCase())}
                className="w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                placeholder="e.g. MNQ"
              />
            ) : (
              <span className="text-slate-200">{trade.symbol ?? "—"}</span>
            )}
          </div>

          {/* Session (read-only) */}
          <div className="flex items-center justify-between gap-3">
            <span>Session:</span>
            <span className="text-slate-200">{trade.session ?? "—"}</span>
          </div>

          {/* Side – edit only */}
          {isEditing && (
            <div className="flex items-center justify-between gap-3">
              <span>Side:</span>
              <select
                value={draftSide ?? ""}
                onChange={(e) =>
                  setDraftSide((e.target.value || null) as TradeSide | null)
                }
                className="w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
              >
                <option value="">—</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          )}

          {/* Outcome – edit only */}
          {isEditing && (
            <div className="flex items-center justify-between gap-3">
              <span>Outcome:</span>
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
            </div>
          )}
        </div>
      </div>

      {/* Strategies – edit controls */}
      {isEditing && (
        <div className="mt-4 space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium text-xs">
                Strategies
              </span>
              <OverviewTagPill className="border-slate-600 text-slate-300">
                Tag each setup
              </OverviewTagPill>
            </div>
            {draftStrategies.length > 0 && (
              <button
                type="button"
                onClick={() => setDraftStrategies([])}
                className="text-[10px] text-slate-400 hover:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {/* Input + add button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative w-full sm:max-w-md">
                <input
                  type="text"
                  value={strategyInput}
                  onChange={(e) => setStrategyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      onAddStrategy(strategyInput)
                    }
                  }}
                  placeholder="Type to search or create e.g. 20 EMA Bounce"
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 pr-10 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onAddStrategy(strategyInput)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-slate-900 hover:bg-teal-400 disabled:opacity-40"
                  disabled={!strategyInput.trim()}
                  aria-label="Add strategy"
                >
                  +
                </button>

                {/* Suggestions dropdown */}
                {filteredSuggestions.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-900 text-xs shadow-lg">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onAddStrategy(s)}
                        className="flex w-full items-center justify-between px-2 py-1 text-left text-slate-200 hover:bg-slate-800"
                      >
                        <span>{s}</span>
                        <span className="text-[10px] text-slate-400">
                          Tap to add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected strategy pills */}
            {draftStrategies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draftStrategies.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onRemoveStrategy(s)}
                    className="group inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-100 hover:border-teal-500 hover:bg-slate-800"
                  >
                    <span className="truncate max-w-[10rem]">{s}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-teal-300">
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strategies summary */}
      {effectiveStrategies.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-300">
          <span className="font-medium text-slate-200">
            Strategies used:
          </span>{" "}
          <span className="break-words">{effectiveStrategies.join(", ")}</span>
        </div>
      )}
    </section>
  )
}