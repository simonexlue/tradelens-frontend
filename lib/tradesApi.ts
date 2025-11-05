// lib/tradesApi.ts 
export async function listTrades() {
  const r = await fetch('/api/trades', { cache: 'no-store' });
  if (!r.ok) throw new Error('Failed to fetch trades');
  return r.json();
}

export async function createTrade(payload: { note: string; takenAt?: string | null }) {
  const r = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('Failed to create trade');
  return r.json() as Promise<{ tradeId: string }>;
}

export function imageSrcForKey(key: string, opts?: Record<string, string | number>) {
  const qs = opts ? '?' + new URLSearchParams(Object.entries(opts).map(([k,v]) => [k, String(v)])).toString() : '';
  return `/api/images/${key}${qs}`; 
}
