"use client";

import { useEffect, useState, useMemo } from "react";
import TradeCard from "@/components/TradeCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type {
  TradeListItem,
  TradeOutcome,
  Session,
} from "@/types/trades";

type PageResp = { items: TradeListItem[]; nextCursor: string | null };

type FilterState = {
  outcomes: TradeOutcome[];
  sessions: Session[];
  strategies: string[];
};

const OUTCOME_LABELS: Record<TradeOutcome, string> = {
  win: "Win",
  loss: "Loss",
  breakeven: "Break Even",
  early_exit: "Early Exit",
};

const SESSION_LABELS: Record<Session, string> = {
  London: "London",
  NY: "New York",
  Break: "Break",
  Asia: "Asia",
};

async function fetchTrades(opts: {
  limit: number;
  cursor: string | null;
}): Promise<PageResp> {
  const qs = new URLSearchParams({
    limit: String(opts.limit),
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
  }).toString();
  const r = await fetch(`/api/trades?${qs}`, { cache: "no-store" });
  if (!r.ok)
    throw new Error(await r.text().catch(() => "Failed loading trades"));
  return r.json();
}

export default function TradesListClient() {
  const [items, setItems] = useState<TradeListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    outcomes: [],
    sessions: [],
    strategies: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterOptions = useMemo(() => {
    const outcomeSet = new Set<TradeOutcome>();
    const sessionSet = new Set<Session>();
    const strategySet = new Set<string>();

    for (const t of items) {
      if (t.outcome) outcomeSet.add(t.outcome);
      if (t.session) sessionSet.add(t.session);
      if (t.strategy && t.strategy.trim() !== "") {
        strategySet.add(t.strategy.trim());
      }
    }

    return {
      outcomes: Array.from(outcomeSet),
      sessions: Array.from(sessionSet),
      strategies: Array.from(strategySet),
    };
  }, [items]);

  const hasActiveFilters =
    filters.outcomes.length > 0 ||
    filters.sessions.length > 0 ||
    filters.strategies.length > 0;

  const filteredItems = useMemo(() => {
    if (!hasActiveFilters) return items;

    return items.filter((t) => {
      const matchOutcome =
        filters.outcomes.length === 0 ||
        (t.outcome && filters.outcomes.includes(t.outcome));

      const matchSession =
        filters.sessions.length === 0 ||
        (t.session && filters.sessions.includes(t.session));

      const matchStrategy =
        filters.strategies.length === 0 ||
        (t.strategy && filters.strategies.includes(t.strategy.trim()));

      return matchOutcome && matchSession && matchStrategy;
    });
  }, [items, filters, hasActiveFilters]);

  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string; onClick: () => void }[] = [];

    // Outcomes
    for (const o of filters.outcomes) {
      pills.push({
        key: `outcome-${o}`,
        label: OUTCOME_LABELS[o],
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            outcomes: prev.outcomes.filter((x) => x !== o),
          })),
      });
    }

    // Sessions
    for (const s of filters.sessions) {
      pills.push({
        key: `session-${s}`,
        label: SESSION_LABELS[s],
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            sessions: prev.sessions.filter((x) => x !== s),
          })),
      });
    }

    // Strategies
    for (const strat of filters.strategies) {
      pills.push({
        key: `strategy-${strat}`,
        label: strat,
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            strategies: prev.strategies.filter((x) => x !== strat),
          })),
      });
    }

    return pills;
  }, [filters]);

  async function loadMore(initial = false) {
    try {
      setLoading(true);
      setError(null);
      const { items: newItems, nextCursor } = await fetchTrades({
        limit: 10,
        cursor: initial ? null : cursor,
      });
      setItems((prev) => (initial ? newItems : [...prev, ...newItems]));
      setCursor(nextCursor);
    } catch (e: any) {
      setError(e?.message ?? "Failed loading trades");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">My Trades</h1>
        <Link href="/trades-new">
          <Button className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900">
            New Trade
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
          {error}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="flex w-full justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      )}

      {/* Filters wrapper */}
      {(filterOptions.outcomes.length > 0 ||
        filterOptions.sessions.length > 0 ||
        filterOptions.strategies.length > 0) && (
        <section className="mb-4">
          {/* Header row: title + chevron + active pills + clear button */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="flex items-center gap-1 text-sm font-medium text-slate-200"
              >
                Filters
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Active filter pills outside the box */}
              {activeFilterPills.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {activeFilterPills.map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={pill.onClick}
                      className="rounded-full border border-teal-500/60 bg-teal-500/10 px-3 py-0.5 text-xs text-teal-200 hover:bg-teal-500/20"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  setFilters({ outcomes: [], sessions: [], strategies: [] })
                }
                className="text-xs text-slate-400 hover:text-teal-300"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Collapsible filter panel box */}
          {filtersOpen && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="space-y-3 text-xs">
                {/* Outcome group */}
                {filterOptions.outcomes.length > 0 && (
                  <div>
                    <p className="mb-1 text-slate-400">Outcome</p>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.outcomes.map((o) => {
                        const active = filters.outcomes.includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                outcomes: active
                                  ? prev.outcomes.filter((x) => x !== o)
                                  : [...prev.outcomes, o],
                              }))
                            }
                            className={[
                              "rounded-full px-3 py-1 border text-xs transition",
                              active
                                ? "border-teal-500 bg-teal-500/20 text-teal-200"
                                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/60",
                            ].join(" ")}
                          >
                            {OUTCOME_LABELS[o]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Session group */}
                {filterOptions.sessions.length > 0 && (
                  <div>
                    <p className="mb-1 text-slate-400">Session</p>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.sessions.map((s) => {
                        const active = filters.sessions.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                sessions: active
                                  ? prev.sessions.filter((x) => x !== s)
                                  : [...prev.sessions, s],
                              }))
                            }
                            className={[
                              "rounded-full px-3 py-1 border text-xs transition",
                              active
                                ? "border-teal-500 bg-teal-500/20 text-teal-200"
                                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/60",
                            ].join(" ")}
                          >
                            {SESSION_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Strategy group */}
                {filterOptions.strategies.length > 0 && (
                  <div>
                    <p className="mb-1 text-slate-400">Strategy</p>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.strategies.map((strat) => {
                        const active = filters.strategies.includes(strat);
                        return (
                          <button
                            key={strat}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                strategies: active
                                  ? prev.strategies.filter((x) => x !== strat)
                                  : [...prev.strategies, strat],
                              }))
                            }
                            className={[
                              "rounded-full px-3 py-1 border text-xs transition",
                              active
                                ? "border-teal-500 bg-teal-500/20 text-teal-200"
                                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/60",
                            ].join(" ")}
                          >
                            {strat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
        {filteredItems.map((t) => {
          const firstKey = t.images?.[0]?.s3_key ?? null;
          const entryTime = t.taken_at ?? t.created_at;
          return (
            <TradeCard
              key={t.id}
              id={t.id}
              note={t.note}
              created_at={entryTime}
              thumbnail_s3_key={firstKey}
              image_count={t.image_count}
            />
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        {cursor && (
          <Button disabled={loading} onClick={() => loadMore(false)}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
}
