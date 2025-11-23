"use client";

import { useEffect, useState } from "react";
import TradeCard from "@/components/TradeCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type TradeListItem = {
  id: string;
  note: string | null;
  created_at: string; // ISO
  images: { s3_key: string }[];
  image_count?: number;
};

type PageResp = { items: TradeListItem[]; nextCursor: string | null };

async function fetchTrades(opts: {
  limit: number;
  cursor: string | null;
}): Promise<PageResp> {
  const qs = new URLSearchParams({
    limit: String(opts.limit),
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
  }).toString();
  const r = await fetch(`/api/trades?${qs}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text().catch(() => "Failed loading trades"));
  return r.json();
}

export default function TradesListClient() {
  const [items, setItems] = useState<TradeListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore(initial = false) {
    try {
      setLoading(true);
      setError(null);
      const { items: newItems, nextCursor } = await fetchTrades({
        limit: 12,
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
    <div className="mx-4 md:mx-8 xl:mx-20 py-6">
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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
        {items.map((t) => {
          const firstKey = t.images?.[0]?.s3_key ?? null;
          return (
            <TradeCard
              key={t.id}
              id={t.id}
              note={t.note}
              created_at={t.created_at}
              thumbnail_s3_key={firstKey}
              image_count={t.image_count}
            />
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <Button disabled={loading || !cursor} onClick={() => loadMore(false)}>
          {loading ? "Loading..." : cursor ? "Load more" : "No more"}
        </Button>
      </div>
    </div>
  );
}
