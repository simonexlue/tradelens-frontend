"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Redirect to login page
    router.push("/auth-login");
  }

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="text-slate-300 border-slate-700 hover:bg-slate-800"
    >
      Log Out
    </Button>
  );
}
