"use client";

import { useEffect, useState } from "react";
import TradeCard from "@/components/TradeCard";
import Link from "next/link";
import { Button } from "@/components/ui/button"

type TradeListItem = {
    id: string;
    note: string | null;
    created_at: string // ISO
    images: {s3_key: string}[];
    image_count?: number;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, ""); // strip trailing /
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID!;

async function fetchTrades(opts: { limit?: number; cursor?: string | null }) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);   // don't send cursor= when empty

  // IMPORTANT: no double slashes, and try NO trailing slash on the resource
  const url = `${API_BASE}/trades${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "x-user-id": DEV_USER_ID, // triggers preflight
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || j.error || JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Failed to fetch trades (${res.status}) ${detail}`.trim());
  }

  return (await res.json()) as { items: TradeListItem[]; nextCursor: string | null };
}

export default function TradeListPage() {
    const [items, setItems] = useState<TradeListItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string |null>(null);

  useEffect(() => {
    // basic env guard like /trades-new
    if (!API_BASE || !DEV_USER_ID) {
      setError("Missing NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_DEV_USER_ID");
      return;
    }
    void loadMore();
  }, []);

  async function loadMore() {
    try {
      setLoading(true);
      setError(null);
      const { items: newItems, nextCursor } = await fetchTrades({ limit: 12, cursor });
      setItems((prev) => [...prev, ...newItems]);
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
                    <Button className="bg-[#18B6B2] hover:bg-[#10a3a0] text-slate-900">New Trade</Button>
                </Link>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
                    {error}
                </div>
            )}

            <ul>
                {items.map((t) => {
                    const firstKey = t.images?.[0]?.s3_key ?? null;
                    return (
                        <li key={t.id}>
                            <TradeCard 
                                id={t.id}
                                note={t.note}
                                created_at={t.created_at}
                                thumbnail_s3_key={firstKey}
                                image_count={t.image_count}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}