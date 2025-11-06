import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerSupabase() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // hooks wire to Next's cookie store
      cookies: {
        getAll() {
          return store.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        },
      },
      // matches new helper’s cookie format
      cookieEncoding: "base64url",
    }
  );
}
