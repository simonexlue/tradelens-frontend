import type { NextRequest } from "next/server";
import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function GET(request: NextRequest, args: any) {
  if (!BACKEND) return new Response("BACKEND_BASE_URL not set", { status: 500 });

  // unwrap params safely for local + Vercel
  const params = await (args?.params ?? args);
  const keyArray = Array.isArray(params?.key)
    ? params.key
    : typeof params?.key === "string"
    ? [params.key]
    : [];

  if (!keyArray.length) return new Response("No key provided", { status: 400 });

  // tolerate encoded single segment (u%2F...%2Ffile.png)
  const segs =
    keyArray.length === 1 && keyArray[0].includes("%2F")
      ? decodeURIComponent(keyArray[0]).split("/")
      : keyArray;

  const keyPath = segs.join("/");
  const search = request.nextUrl.search ?? "";

  // forward Supabase JWT so backend can authorize
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const r = await fetch(`${BACKEND}/images/${keyPath}${search}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!r.ok || !r.body) {
    const msg = await r.text().catch(() => "Image fetch failed");
    return new Response(msg, { status: r.status || 502 });
  }

  return new Response(r.body, {
    status: 200,
    headers: {
      "content-type": r.headers.get("content-type") ?? "image/jpeg",
      "cache-control": r.headers.get("cache-control") ?? "public, max-age=60, s-maxage=300",
      ...(r.headers.get("etag") ? { etag: r.headers.get("etag")! } : {}),
    },
  });
}
