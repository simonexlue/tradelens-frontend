import { NextRequest } from "next/server"
import { getServerSupabase } from "../../_lib/supabaseServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BACKEND = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(
  /\/+$/,
  ""
)

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    return new Response("BACKEND_BASE_URL not set", { status: 500 })
  }

  const supabase = await getServerSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return new Response("Not authenticated", { status: 401 })
  }

  const body = await req.json()

  const backendRes = await fetch(`${BACKEND}/trades/import-csv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await backendRes.text()

  return new Response(text, {
    status: backendRes.status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}