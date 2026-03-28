import { redirect } from "next/navigation";
import { hasSupabaseServerEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  if (!hasSupabaseServerEnv()) {
    redirect("/home");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/home");
}
