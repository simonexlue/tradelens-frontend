import { getServerSupabase } from "../../_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { session }, error } = await supabase.auth.getSession();

  return new Response(
    JSON.stringify({
      authenticated: !!session,
      error: error?.message ?? null,
      access_token_exists: !!session?.access_token,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}
