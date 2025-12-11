"use client"

import { useRouter } from "next/navigation"

type Props = {
  id: string
  note: string | null
  created_at: string
  thumbnail_s3_key?: string | null
  image_count?: number
  symbol?: string | null
  pnl?: number | null // 👈 new
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return ""
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function TradeCard({
  id,
  note,
  created_at,
  thumbnail_s3_key,
  symbol,
  pnl,
}: Props) {
  const router = useRouter()
  const imgSrc = thumbnail_s3_key
    ? `/api/images/${encodeURIComponent(thumbnail_s3_key)}?fit=thumb`
    : null

  const handleClick = () => {
    router.push(`/trade-detail?id=${id}`)
  }

  const pnlClasses =
    pnl == null
      ? ""
      : pnl > 0
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/60 bg-red-500/10 text-red-300"

  const formattedPnl =
    pnl == null ? "" : `${pnl > 0 ? "+" : ""}$${Math.abs(pnl).toFixed(0)}`

  return (
    <div
      onClick={handleClick}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-colors hover:border-teal-500/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Trade screenshot"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400">
            No image
          </div>
        )}

        {symbol != null && (
          <div className="absolute left-2 top-2 flex items-center gap-1">
            {symbol && (
              <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                {symbol}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex min-h-[96px] flex-col justify-between p-4">
        <p className="line-clamp-2 text-sm text-slate-200">
          {note?.slice(0, 80) || "(no note)"}
          {note && note.length > 80 ? "…" : ""}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-400">{formatDate(created_at)}</span>

          {pnl != null && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] opacity-70 ${
                pnl > 0
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                  : "border-red-500/20 bg-red-500/5 text-red-300"
              }`}
            >
              {pnl > 0 ? "+" : "-"}${Math.abs(pnl).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
