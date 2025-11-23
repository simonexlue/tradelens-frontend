import { redirect } from "next/navigation";
import { getServerSupabase } from "../api/_lib/supabaseServer";

import TradesListClient from "./TradesListClient";

export default async function TradeListPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth-login");
  }

  return <TradesListClient />;
}
