# Copilot Instructions for This Repository

## Architecture Rules

- Use Prisma as the default data access layer for application data and CRUD.
- Use the shared Prisma client from `src/lib/prisma.ts`.
- Keep database models and queries aligned with `prisma/schema.prisma`.
- Do not introduce direct SQL or Supabase table queries in route handlers if Prisma already covers the use case.

## Supabase Usage Rules

- Use Supabase clients for authentication/session concerns, cookies, and auth flows.
- Prefer existing helpers in `src/lib/supabase/` (`server.ts`, `client.ts`, `admin.ts`, `middleware.ts`).
- Keep auth and data access concerns separated:
  - Supabase: identity/session.
  - Prisma: business data reads/writes.

## API and Server Code Preferences

- For app APIs under `src/app/api/**`, read and write business entities via Prisma.
- Reuse auth/session helpers from `src/lib/auth/` and avoid duplicating session parsing logic.
- Keep role checks and authorization explicit and close to route logic.

## Prisma Conventions

- Use generated Prisma types from `src/generated/prisma/` when needed.
- Favor typed Prisma queries and schema-driven changes over ad-hoc data mapping.
- For schema changes, create migrations and keep API handlers compatible with new fields.
- Treat "schema change + migration apply" as one logical task; do not stop at code-only changes.

## Migration and DB Connectivity Guardrails

- Prefer `DATABASE_URL_POOLER` for Prisma runtime/CLI connectivity, with `DATABASE_URL` as fallback.
- Keep `prisma.config.ts` datasource URL aligned with the same precedence used by app runtime.
- Before relying on a new model/table in API/auth flows, verify migrations are applied in the target DB.
- If runtime errors include "table does not exist", guide/apply migration (`prisma migrate deploy`) before changing business logic.
- If errors include `ENETUNREACH`/IPv6 direct-host failures, prefer Supabase Transaction Pooler connection string.
- Do not monkey-patch global DNS APIs as a fix strategy for Prisma/pg.

## Environment and Safety

- Do not hardcode credentials or tokens.
- Use `DATABASE_URL_POOLER` (preferred) or `DATABASE_URL` for Prisma and existing Supabase env helpers for Supabase keys/URL.
- Keep service role usage server-only.

## Editing Guidance

- Preserve current project patterns and naming.
- Avoid large refactors unless explicitly requested.
- When adding a new feature touching data:
  - 1. Validate auth context.
  - 2. Query or mutate with Prisma.
  - 3. Return consistent JSON shape and proper status codes.
