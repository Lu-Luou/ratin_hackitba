import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { setDefaultResultOrder } from "node:dns";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function hasExpectedDelegates(client: PrismaClient) {
  const candidate = client as unknown as Record<string, unknown>;

  return Boolean(candidate.appUser && candidate.todo && candidate.field);
}

const databaseUrl = process.env.DATABASE_URL_POOLER?.trim() || process.env.DATABASE_URL;
const usingPooler = Boolean(process.env.DATABASE_URL_POOLER?.trim());

if (!databaseUrl) {
  throw new Error("DATABASE_URL (or DATABASE_URL_POOLER) is required to initialize PrismaClient.");
}

if (process.env.NODE_ENV !== "production") {
  try {
    const parsed = new URL(databaseUrl);
    console.info("[prisma] Initializing adapter", {
      host: parsed.hostname,
      port: parsed.port || "default",
      usingPooler,
    });
  } catch {
    console.info("[prisma] Initializing adapter", {
      usingPooler,
    });
  }
}

// Supabase DB hosts can resolve IPv6 first; many local networks are IPv4-only.
setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool, {
  onPoolError(error) {
    console.error("[prisma] pg pool error", {
      message: error.message,
      name: error.name,
    });
  },
  onConnectionError(error) {
    console.error("[prisma] pg connection error", {
      message: error.message,
      name: error.name,
    });
  },
});

function createClient() {
  return new PrismaClient({ adapter });
}

const cachedPrisma = globalForPrisma.prisma;

export const prisma = cachedPrisma && hasExpectedDelegates(cachedPrisma) ? cachedPrisma : createClient();

if (cachedPrisma && cachedPrisma !== prisma) {
  console.warn("[prisma] Cached client was stale after schema update. Reinitialized PrismaClient.");
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
