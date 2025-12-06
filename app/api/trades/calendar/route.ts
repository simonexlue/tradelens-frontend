import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const store = await cookies();

  return (
    store.get("sb-access-token")?.value ??
    store.get("sb-access-token-v2")?.value ??
    store.get("supabase-auth-token")?.value
  );
}

async function getAccessToken(): Promise<string | undefined> {
  // 1) Try Supabase server client first
  try {
    const supabase = await getServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (e) {
    console.error("getServerSupabase().auth.getSession() failed:", e);
  }

  // 2) Fallback: read directly from cookies
  return getAccessTokenFromCookies();
}

export async function GET(req: NextRequest) {
  if (!BACKEND) {
    return new Response("BACKEND_BASE_URL not set", { status: 500 });
  }

  const token = await getAccessToken();
  if (!token) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const upstreamUrl = new URL(`${BACKEND}/trades/calendar`);
  searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  const r = await fetch(upstreamUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  return new Response(await r.text(), {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
