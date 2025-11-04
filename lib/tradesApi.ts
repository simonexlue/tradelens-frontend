export type TradeListItem = {
  id: string;
  note: string | null;
  created_at: string;
  images: { s3_key: string }[];
  image_count?: number;
};

export type TradeImage = {
  id?: string;
  s3_key: string;
  width?: number | null;
  height?: number | null;
  created_at?: string;
};

export type Trade = {
  id: string;
  note: string | null;
  created_at: string;
  images: TradeImage[];
  analysis?: {
    what_happened?: string;
    why_worked_or_not?: string;
    tips?: string[];
  } | null;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID!;

export async function fetchTrades(opts: { limit?: number; cursor?: string | null }) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor!);

  const url = `${API_BASE}/trades${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-user-id": DEV_USER_ID,
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Failed to fetch trades (${res.status})`);
  return (await res.json()) as { items: TradeListItem[]; nextCursor: string | null };
}

export async function fetchTrade(id: string) {
  const res = await fetch(`${API_BASE}/trades/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { accept: "application/json", "x-user-id": DEV_USER_ID },
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
    throw new Error(`Failed to fetch trade (${res.status}) ${detail}`.trim());
  }
  return (await res.json()) as Trade;
}

export function imgUrl(key: string, opts?: { fit?: "thumb" | "raw"; w?: number }) {
  const base = `/api/images/${encodeURIComponent(key)}`;
  if (opts?.fit === "thumb") return `${base}?fit=thumb`;
  if (opts?.w) return `${base}?w=${opts.w}`;
  return base;
}

export async function updateTradeNote(id: string, note: string) {
  if (!API_BASE) throw new Error("API base not configured (NEXT_PUBLIC_API_BASE).");

  const res = await fetch(`${API_BASE}/trades/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-user-id": DEV_USER_ID,
    },
    body: JSON.stringify({ note }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || j.error || JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Failed to update note (${res.status}) ${detail}`.trim());
  }

  return (await res.json()) as Trade;
}