import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/config";

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;

function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }

  return browserClient;
}
