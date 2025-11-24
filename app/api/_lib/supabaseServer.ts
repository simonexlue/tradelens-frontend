import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerSupabase() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Supabase expects { name, value }
          return store.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              store.set(name, value, options);
            });
          } catch {
            // Ignore in environments where cookie mutation isn't allowed
          }
        },
      },
      cookieEncoding: "base64url",
    }
  );
}
