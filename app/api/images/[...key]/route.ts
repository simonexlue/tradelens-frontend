import type { NextRequest } from "next/server";

type Params = { key: string[] };

const BACKEND = (process.env.BACKEND_BASE_URL ?? "").replace(/\/+$/, "");
export const dynamic = "force-dynamic"; // avoid any ISR caching surprises

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> } // <-- params is a Promise
) {
  const { key } = await params;           // <-- unwrap it
  const keyPath = key.join("/");
  const search = req.nextUrl.search ?? "";
  const url = `${BACKEND}/images/${keyPath}${search}`;

  const userId =
    req.headers.get("x-user-id") ??
    process.env.NEXT_PUBLIC_DEV_USER_ID ??
    "dev-user";

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-user-id": userId },
    cache: "no-store",
  });

  if (!res.ok || !res.body) {
    return new Response(await res.text(), { status: res.status || 502 });
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": res.headers.get("cache-control") ?? "private, max-age=60",
      "etag": res.headers.get("etag") ?? "",
    },
  });
}