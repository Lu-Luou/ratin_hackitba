---
applyTo: "src/app/api/**/*.ts,src/lib/**/*.ts,src/lib/**/*.tsx,prisma/**/*.prisma,prisma.config.ts"
---

# Prisma + Supabase Working Mode

This project uses a split responsibility model:

- Supabase handles authentication/session identity.
- Prisma handles application data access.

## Required defaults

- For CRUD and business entities, use Prisma.
- Import the shared Prisma client from `@/lib/prisma`.
- Reuse auth/session helpers from `@/lib/auth` and `@/lib/supabase`.
- Prefer `DATABASE_URL_POOLER` for Prisma connectivity in local/dev CI where IPv6 may be unavailable.

## Avoid by default

- Avoid direct `supabase.from("...")` data queries in API routes for business tables that exist in Prisma.
- Avoid mixing two write paths (Supabase table write + Prisma write) for the same entity in the same feature.

## Implementation pattern

1. Resolve current session/user context.
2. Authorize based on role or ownership.
3. Execute Prisma query or mutation.
4. Return predictable API JSON and HTTP status.

## Preflight checks for new features

1. If models/tables changed, create migration and include it in the PR.
2. Ensure `prisma.config.ts` points datasource URL to `DATABASE_URL_POOLER` first, then `DATABASE_URL` fallback.
3. Apply migrations in target database before validating feature behavior.
4. If error indicates missing table, fix migration state first (not handler logic first).
5. If connectivity errors show `ENETUNREACH` with direct Supabase DB host, switch to Transaction Pooler URL.

## Consistency rules

- Keep DTO/response fields consistent (`createdAt`/`updatedAt` serialized as ISO strings where needed).
- Keep validation near handlers (e.g. with Zod) and before DB operations.
- Prefer explicit `select`/`where`/`orderBy` in Prisma queries.
