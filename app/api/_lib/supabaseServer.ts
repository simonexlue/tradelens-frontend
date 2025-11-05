import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function getServerSupabase() {
  // In your setup cookies() is async
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options as any);
          }
        },
      },
    }
  );
}
