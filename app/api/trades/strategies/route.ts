import { NextRequest } from "next/server";
import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function GET(request: NextRequest) {
    if(!BACKEND) {
        return new Response("BACKEND_BASE_URL note set", {status: 500})
    }

    const supabase = await getServerSupabase();
    const {
        data: {session},
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if(!token) {
        return new Response("Not authenticated", {status: 401});
    }

      const r = await fetch(`${BACKEND}/trades/strategies`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("Content-Type") ?? "application/json",
    },
  });
}