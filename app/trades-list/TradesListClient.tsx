"use client";

import { useEffect, useState, useMemo } from "react";
import TradeCard from "@/components/TradeCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { TradeListItem, TradeOutcome, Session } from "@/types/trades";

import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { FilterGroup } from "@/components/filters/FilterGroup";

type PageResp = { items: TradeListItem[]; nextCursor: string | null };

type FilterState = {
  outcomes: TradeOutcome[];
  sessions: Session[];
  strategies: string[];
  symbols: string[];
};

type FetchTradesOpts = {
  limit: number;
  cursor: string | null;
  filters: FilterState;
};

type FilterOptions = {
  outcomes: TradeOutcome[];
  sessions: Session[];
  strategies: string[];
  symbols: string[];
}

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

const PAGE_LIMIT = 10;

async function fetchTrades(opts: FetchTradesOpts): Promise<PageResp> {
  const qs = new URLSearchParams({
    limit: String(opts.limit),
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
  });

  // Add filters as repeated query params: ?outcome=win&outcome=loss&session=London...
  opts.filters.outcomes.forEach((o) => qs.append("outcome", o));
  opts.filters.sessions.forEach((s) => qs.append("session", s));
  opts.filters.strategies.forEach((s) => qs.append("strategy", s));
  opts.filters.symbols.forEach((s) => qs.append("symbol", s));

  const r = await fetch(`/api/trades?${qs.toString()}`, { cache: "no-store" });
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
    symbols: [],
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    outcomes: [],
    sessions: [],
    strategies: [],
    symbols: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load available filter options (outcomes/sessions/strategies/symbols)
    (async () => {
      try {
        const r = await fetch("/api/trades/filters", { cache: "no-store" });
        if (!r.ok) {
          console.error("Failed to load filter options", await r.text());
          return;
        }
        const data = await r.json();
        setFilterOptions({
          outcomes: (data.outcomes ?? []) as TradeOutcome[],
          sessions: (data.sessions ?? []) as Session[],
          strategies: (data.strategies ?? []) as string[],
          symbols: (data.symbols ?? []) as string[],
        });
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    })();
  }, []);


  useEffect(() => {
    void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const hasActiveFilters =
    filters.outcomes.length > 0 ||
    filters.sessions.length > 0 ||
    filters.strategies.length > 0 ||
    filters.symbols.length > 0;

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

    // Symbols
    for (const sym of filters.symbols) {
      pills.push({
        key: `symbol-${sym}`,
        label: sym,
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            symbols: prev.symbols.filter((x) => x !== sym),
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
        limit: PAGE_LIMIT,
        cursor: initial ? null : cursor,
        filters, // pass current filters to the API
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
        filterOptions.strategies.length > 0 ||
        filterOptions.symbols.length > 0) && (
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
              <ActiveFilters pills={activeFilterPills} />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    outcomes: [],
                    sessions: [],
                    strategies: [],
                    symbols: [],
                  })
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
                <FilterGroup<TradeOutcome>
                  title="Outcome"
                  options={filterOptions.outcomes}
                  activeValues={filters.outcomes}
                  labelMap={OUTCOME_LABELS}
                  onToggle={(o) =>
                    setFilters((prev) => ({
                      ...prev,
                      outcomes: prev.outcomes.includes(o)
                        ? prev.outcomes.filter((x) => x !== o)
                        : [...prev.outcomes, o],
                    }))
                  }
                />

                <FilterGroup<Session>
                  title="Session"
                  options={filterOptions.sessions}
                  activeValues={filters.sessions}
                  labelMap={SESSION_LABELS}
                  onToggle={(s) =>
                    setFilters((prev) => ({
                      ...prev,
                      sessions: prev.sessions.includes(s)
                        ? prev.sessions.filter((x) => x !== s)
                        : [...prev.sessions, s],
                    }))
                  }
                />

                <FilterGroup<string>
                  title="Strategy"
                  options={filterOptions.strategies}
                  activeValues={filters.strategies}
                  onToggle={(strat) =>
                    setFilters((prev) => ({
                      ...prev,
                      strategies: prev.strategies.includes(strat)
                        ? prev.strategies.filter((x) => x !== strat)
                        : [...prev.strategies, strat],
                    }))
                  }
                />

                <FilterGroup<string>
                  title="Symbol"
                  options={filterOptions.symbols}
                  activeValues={filters.symbols}
                  onToggle={(sym) =>
                    setFilters((prev) => ({
                      ...prev,
                      symbols: prev.symbols.includes(sym)
                        ? prev.symbols.filter((x) => x !== sym)
                        : [...prev.symbols, sym],
                    }))
                  }
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
        {items.map((t) => {
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
