import type { NextRequest } from "next/server";

export const runtime = "nodejs"; 
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  args: any 
) {
  const params = await (args.params ?? args);
  const keyArray = Array.isArray(params?.key)
    ? params.key
    : typeof params?.key === "string"
    ? [params.key]
    : [];

  if (!keyArray.length) {
    return new Response("No key provided", { status: 400 });
  }

  const segs =
    keyArray.length === 1 && keyArray[0].includes("%2F")
      ? decodeURIComponent(keyArray[0]).split("/")
      : keyArray;

  const keyPath = segs.join("/");
  const search = request.nextUrl.search ?? "";

  const BACKEND =
    (process.env.BACKEND_BASE_URL ||
     process.env.NEXT_PUBLIC_API_BASE ||
     "").replace(/\/+$/, "");
  if (!BACKEND)
    return new Response("BACKEND_BASE_URL not set", { status: 500 });

  const userId =
    request.headers.get("x-user-id") ||
    process.env.DEV_USER_ID ||
    process.env.NEXT_PUBLIC_DEV_USER_ID ||
    "dev-user";

  const res = await fetch(`${BACKEND}/images/${keyPath}${search}`, {
    method: "GET",
    headers: { "x-user-id": userId },
    cache: "no-store",
  });

  if (!res.ok || !res.body)
    return new Response(await res.text().catch(() => "Image fetch failed"), {
      status: res.status || 502,
    });

  return new Response(res.body, {
    status: 200,
    headers: {
      "content-type":
        res.headers.get("content-type") ?? "image/jpeg",
      "cache-control":
        res.headers.get("cache-control") ??
        "public, max-age=60, s-maxage=300",
      ...(res.headers.get("etag") && { etag: res.headers.get("etag")! }),
      ...(res.headers.get("content-length") && {
        "content-length": res.headers.get("content-length")!,
      }),
    },
  });
}
