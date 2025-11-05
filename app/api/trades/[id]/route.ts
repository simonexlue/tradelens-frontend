import { NextRequest } from "next/server";
import { getServerSupabase } from "../../_lib/supabaseServer"; // NOTE: path from /trades/[id]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function GET(request: NextRequest, ctx: any) {
  if (!BACKEND) return new Response("BACKEND_BASE_URL not set", { status: 500 });

  // params may be a Promise on Next 16 prod builds
  const params = await (ctx?.params ?? ctx);
  const id = params?.id as string | undefined;
  if (!id) return new Response("Missing trade id", { status: 400 });

  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return new Response("Not authenticated", { status: 401 });

  const r = await fetch(`${BACKEND}/trades/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await r.text().catch(() => "");
  return new Response(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}

export async function PUT(request: NextRequest, ctx: any) {
  if (!BACKEND) return new Response("BACKEND_BASE_URL not set", { status: 500 });

  const params = await (ctx?.params ?? ctx);
  const id = params?.id as string | undefined;
  if (!id) return new Response("Missing trade id", { status: 400 });

  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return new Response("Not authenticated", { status: 401 });

  const body = await request.text();

  const r = await fetch(`${BACKEND}/trades/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
    body,
  });

  const text = await r.text().catch(() => "");
  return new Response(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}
