import { NextRequest } from "next/server";
import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  if (!BACKEND) return new Response("BACKEND_BASE_URL not set", { status: 500 });

  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return new Response("Not authenticated", { status: 401 });

  const body = await req.text();

  const r = await fetch(`${BACKEND}/uploads/presign`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": req.headers.get("content-type") ?? "application/json",
    },
    body,
  });

  return new Response(await r.text(), {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}
