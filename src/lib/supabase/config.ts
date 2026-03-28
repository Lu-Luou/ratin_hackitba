const SUPABASE_URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;
const SUPABASE_PUBLIC_KEY_KEYS = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

function firstNonEmpty(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function deriveSupabaseUrlFromDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname;

    // Standard direct connection host: db.<project-ref>.supabase.co
    if (host.startsWith("db.") && host.endsWith(".supabase.co")) {
      const projectRef = host.slice(3, -".supabase.co".length);
      if (projectRef) {
        return `https://${projectRef}.supabase.co`;
      }
    }

    // Pooler host can encode project ref in username: postgres.<project-ref>
    if (host.endsWith(".pooler.supabase.com")) {
      const [_, projectRef] = parsed.username.split(".");
      if (projectRef) {
        return `https://${projectRef}.supabase.co`;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function getSupabasePublicEnv() {
  const supabaseUrl = firstNonEmpty(SUPABASE_URL_KEYS) ?? deriveSupabaseUrlFromDatabaseUrl();
  const supabaseAnonKey = firstNonEmpty(SUPABASE_PUBLIC_KEY_KEYS);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public environment variables. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    supabaseUrl: normalizeUrl(supabaseUrl),
    supabaseAnonKey,
  };
}

export function getSupabaseServerEnv() {
  const supabaseUrl = firstNonEmpty(SUPABASE_URL_KEYS) ?? deriveSupabaseUrlFromDatabaseUrl();
  const supabaseKey = firstNonEmpty(SUPABASE_PUBLIC_KEY_KEYS) ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase server environment variables. Configure DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or provide NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return {
    supabaseUrl: normalizeUrl(supabaseUrl),
    supabaseKey,
  };
}

export function hasSupabaseServerEnv() {
  const supabaseUrl = firstNonEmpty(SUPABASE_URL_KEYS) ?? deriveSupabaseUrlFromDatabaseUrl();
  const supabaseKey = firstNonEmpty(SUPABASE_PUBLIC_KEY_KEYS) ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseEnv() {
  return getSupabasePublicEnv();
}
