"use client";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  note: string | null;
  created_at: string;
  thumbnail_s3_key?: string | null;
  image_count?: number;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TradeCard({
  id,
  note,
  created_at,
  thumbnail_s3_key,
  image_count,
}: Props) {
  const router = useRouter();
  const imgSrc = thumbnail_s3_key
    ? `/api/images/${encodeURIComponent(thumbnail_s3_key)}?fit=thumb`
    : null;

  const handleClick = () => {
    router.push(`/trade-detail?id=${id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group block cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-colors hover:border-teal-500/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {imgSrc ? (
          // plain <img> to avoid Next image optimizer stripping cookies
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

        {typeof image_count === "number" && (
          <div className="absolute right-2 top-2 rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-xs text-slate-200 backdrop-blur">
            {image_count} {image_count === 1 ? "img" : "imgs"}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="p-4 flex flex-col justify-between min-h-[96px]">
        <p className="line-clamp-2 text-sm text-slate-200">
          {note?.slice(0, 80) || "(no note)"}
          {note && note.length > 80 ? "…" : ""}
        </p>
        <div className="mt-3 text-xs text-slate-400">
          {formatDate(created_at)}
        </div>
      </div>
    </div>
  );
}
