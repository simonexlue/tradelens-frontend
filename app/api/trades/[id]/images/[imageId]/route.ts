import { NextRequest } from "next/server";
import { getServerSupabase } from "@/app/api/_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ""
).replace(/\/+$/, "");

export async function DELETE(request: NextRequest) {
  if (!BACKEND) {
    return new Response("BACKEND_BASE_URL not set", { status: 500 });
  }

  // Parse tradeId + imageId from the URL:
  // /api/trades/{tradeId}/images/{imageId}
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // ["api","trades","{tradeId}","images","{imageId}"]

  const tradesIndex = segments.indexOf("trades");
  if (tradesIndex === -1 || segments.length < tradesIndex + 4) {
    console.error("Unexpected DELETE path", segments);
    return new Response("Invalid path for delete", { status: 400 });
  }

  const tradeId = segments[tradesIndex + 1];
  const imageId = segments[tradesIndex + 3];

  // Get Supabase access token
  const supabase = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return new Response("Not authenticated", { status: 401 });
  }

  // Call FastAPI backend
  const r = await fetch(`${BACKEND}/trades/${tradeId}/images/${imageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const text = await r.text().catch(() => "");

  return new Response(text || null, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "text/plain",
    },
  });
}
