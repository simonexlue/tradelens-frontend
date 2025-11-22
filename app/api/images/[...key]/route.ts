import type { NextRequest } from "next/server";
import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function GET(request: NextRequest, ctx: any) {
  if (!BACKEND) {
    return new Response("BACKEND_BASE_URL not set", { status: 500 });
  }

  // unwrap params for both dev and prod (params may be a Promise)
  const params = await (ctx?.params ?? ctx);
  const rawKey = params?.key;

  const keyArray = Array.isArray(rawKey)
    ? rawKey
    : typeof rawKey === "string"
    ? [rawKey]
    : [];

  if (!keyArray.length) {
    return new Response("No key provided", { status: 400 });
  }

  // Handle encoded single segment (u%2F...%2Ffile.png) vs multi segment
  const segs =
    keyArray.length === 1 && keyArray[0].includes("%2F")
      ? decodeURIComponent(keyArray[0]).split("/")
      : keyArray;

  const keyPath = segs.join("/");
  const search = request.nextUrl.search ?? "";

  // 🔐 Get Supabase session the same way /api/trades does
  const supabase = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return new Response("Not authenticated", { status: 401 });
  }

  // Proxy to FastAPI images endpoint with Bearer token
  const r = await fetch(`${BACKEND}/images/${keyPath}${search}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = r.body;
  if (!r.ok || !body) {
    const msg = await r.text().catch(() => "Image fetch failed");
    return new Response(msg, { status: r.status || 502 });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": r.headers.get("content-type") ?? "image/jpeg",
      "cache-control":
        r.headers.get("cache-control") ?? "public, max-age=60, s-maxage=300",
      ...(r.headers.get("etag") ? { etag: r.headers.get("etag")! } : {}),
    },
  });
}
