import type {
  CreateTradePayload,
  TradeListItem,
  TradeDetail,
} from "@/types/trades"

export async function listTrades(): Promise<{
  items: TradeListItem[];
  nextCursor: string | null;
}> {
  const r = await fetch("/api/trades", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch trades");
  return r.json();
}

export async function createTrade(
  payload: CreateTradePayload
): Promise<{ tradeId: string }> {
  const r = await fetch("/api/trades", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to create trade");
  return r.json();
}

export async function fetchTradeDetail(id: string): Promise<TradeDetail> {
  const r = await fetch(`/api/trades/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load trade");
  return r.json();
}

export async function fetchStrategies(): Promise<string[]> {
  const r = await fetch("/api/trades/strategies", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load strategies");
  const json = await r.json();
  return json.strategies ?? [];
}

export function imageSrcForKey(key: string, opts?: Record<string, string | number>) {
  const qs = opts ? '?' + new URLSearchParams(Object.entries(opts).map(([k,v]) => [k, String(v)])).toString() : '';
  return `/api/images/${key}${qs}`; 
}
