"use client"

import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function LogoutButton() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth-login")
  }

  return (
    <button
      onClick={handleLogout}
      className="
    w-full rounded-md border border-slate-700 px-3 py-2 text-sm
    text-slate-300 bg-slate-900/40
    hover:bg-slate-800 hover:text-slate-100
    transition-colors
  "
    >
      Log Out
    </button>
  )
}
