import { NextRequest } from "next/server";
import { getServerSupabase } from "@/app/api/_lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
    process.env.BACKEND_BASE_URL || 
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
).replace(/\/+$/,"");

export async function POST(request: NextRequest, ctx:any) {
    if(!BACKEND) {
        return new Response("BACKEND_BASE_URL not set", {status: 500});
    }

    const params = await (ctx?.params ?? ctx);
    const id = params?.id as string | undefined;
    if (!id){
        return new Response("Missing trade id", {status: 400});
    }

    const supabase = await getServerSupabase();
    const {
        data: {session},
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if(!token) {
        return new Response("Not authenticated", {status: 401});
    }

    const body = await request.text();

    const r = await fetch(`${BACKEND}/trades/${id}/analyze`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "content-type": request.headers.get("content-type") ?? "application/json",
        },
        body,
        cache: "no-store",
    });

    const text = await r.text().catch(()=> "");

    return new Response(text, {
        status: r.status,
        headers: {
            "content-type": r.headers.get("content-type") ?? "application/json",
        },
    });
}
