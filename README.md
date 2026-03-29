# SoyGuardian

SoyGuardian es una herramienta para asistir a prestamistas y aseguradoras del sector agricola. Combina prediccion de rendimiento con IA, senales meteorologicas y satelitales (NASA/CONAE), y una evaluacion integral de riesgo para lotes especificos.

## Que Resuelve

El problema en el agro-fintech hoy:

- Muchas evaluaciones de riesgo se hacen por region y no por lote.
- Gran parte de la produccion ocurre en campos alquilados, por lo que muchos productores quedan fuera del credito tradicional por falta de garantia real.
- Los peritajes presenciales son lentos y caros, lo que frena colocacion de capital.

La propuesta de SoyGuardian:

- Reducir incertidumbre con monitoreo continuo por lote.
- Priorizar y hacer mas eficientes las visitas de peritos.
- Mejorar precision en underwriting para bancos/aseguradoras.
- Habilitar acceso al credito para productores sin activos tradicionales.

## What It Does

- Authenticates users with Supabase and keeps business data in PostgreSQL via Prisma.
- Manages fields (location, bbox, hectares, costs, risk, repayment profile).
- Runs yield prediction from satellite signals through a Python model endpoint.
- Calculates spot/futures valuation using soy market pricing.
- Generates lender-ready field context and optional PDF reports.
- Runs batch credit decisions for admins with reason codes and confidence.
- Supports nightly prediction refresh using a cron-protected endpoint.

## Architecture

- Frontend/API: Next.js App Router + TypeScript.
- Authentication/session: Supabase.
- Application data/CRUD: Prisma (single source of truth for business entities).
- ML inference: Python endpoint in api/py/predict.py.
- Market/weather/report services: modularized under src/lib.

Data responsibility split:

- Supabase: identity/session.
- Prisma: application models and business reads/writes.

## Tech Stack

- Next.js 16, React 19, TypeScript
- Prisma 7 + PostgreSQL (Supabase)
- Zod validation
- Tailwind CSS 4 + Radix UI
- Python (scikit-learn, pandas, Sentinel Hub SDK)

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL database (Supabase recommended)
- Python 3.10+ (for local ML endpoint workflows)

## Environment Variables

Start from .env.example and create .env.local (or .env).

```bash
cp .env.example .env.local
```

Required:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase + Prisma
DATABASE_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres
DATABASE_URL_POOLER=postgresql://postgres.your-project-ref:password@aws-0-your-region.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Public Supabase keys (recommended for client auth flows)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Python prediction dependencies
SENTINEL_HUB_CLIENT_ID=your-sentinel-hub-client-id
SENTINEL_HUB_CLIENT_SECRET=your-sentinel-hub-client-secret

# Cron protection
CRON_SECRET=change-me
```

Optional:

```env
# If your Python inference runs separately in local/dev
PYTHON_API_URL=http://localhost:5000
```

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Generate Prisma client (also runs on postinstall).

```bash
npx prisma generate
```

3. Apply database migrations.

```bash
npx prisma migrate deploy
```

4. Run the app.

```bash
npm run dev
```

5. Open:

- http://localhost:3000
- Home route auto-redirects to dashboard when authenticated.

## Running The Python Prediction Endpoint

This repository includes a Vercel Python handler at api/py/predict.py.

Options:

- Use Vercel routing for local full-stack simulation (recommended for parity).
- Or run a separate Python service and set PYTHON_API_URL.

Prediction endpoint contract:

- POST /py/predict
- Body:

```json
{
  "bbox": [-62.45, -27.65, -62.44, -27.64],
  "start_date": "2023-11-01",
  "end_date": "2024-04-30"
}
```

## Main Routes

Pages:

- / (redirects to /dashboard if authenticated, otherwise /home)
- /home
- /auth
- /login
- /signup
- /dashboard
- /assistant

## API Overview

Auth:

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

Fields and analytics:

- GET /api/fields
- POST /api/fields
- PUT /api/fields/:fieldId
- DELETE /api/fields/:fieldId
- POST /api/fields/reorder
- GET /api/fields/:fieldId/prediction
- POST /api/fields/:fieldId/prediction
- GET /api/fields/:fieldId/weather

Pricing and predictions:

- GET /api/pricing/soy
- GET /api/predict
- POST /api/predict

Reports:

- GET /api/fields/:fieldId/report/context
- POST /api/fields/:fieldId/report/generate

Alerts:

- GET /api/alerts
- POST /api/alerts

Admin credit engine:

- POST /api/admin/credit-decisions/batch
- GET /api/admin/credit-decisions
- GET /api/admin/users
- PATCH /api/admin/users/:id/role

Cron:

- GET /api/cron/nightly-predictions
- Requires x-cron-secret or Bearer token matching CRON_SECRET.

## Fintech Hackathon Value

- Explainable underwriting via score + reason codes.
- Portfolio-scale batch decisions with run metadata.
- Real-time-ish monitoring through alerts and weather risk.
- Lender output through generated field reports (JSON/PDF).

## Pitch Deck Script (4 Diapositivas)

Puedes usar este guion tal cual para la demo:

1. Diapositiva 1 - Presentacion
- Hola, soy Tomas del grupo null-profits y voy a presentar nuestro proyecto.
- Lo nombramos SoyGuardian.
- Es una herramienta dirigida a empresas financieras como bancos y aseguradoras vinculadas al sector agricola.

2. Diapositiva 2 - Problema
- La soja es un pilar de la economia argentina, pero la evaluacion de riesgo actual tiene fricciones.
- Muchas aseguradoras evaluan por region, sin diferenciar calidad y gestion de cada lote.
- Cerca del 70% de la produccion se realiza en campos alquilados, por lo que muchos productores no pueden usar escritura como garantia.
- Resultado: auditorias lentas, costos operativos altos en peritajes presenciales y capital sin colocar por miedo.

3. Diapositiva 3 - Oportunidad
- Un peritaje presencial puede costar entre 2 y 5 USD por hectarea y requiere dias de viaje.
- En grandes extensiones, el costo escala muy rapido.
- Gran parte del financiamiento del agro ocurre fuera de la banca tradicional.
- Existe un mercado potencial multimillonario que no se captura por falta de herramientas de evaluacion precisa y escalable.

4. Diapositiva 4 - Solucion
- Desarrollamos una plataforma web intuitiva con IA que procesa datos meteorologicos y satelitales (NASA/CONAE).
- El modelo de prediccion actual alcanza aproximadamente 72% de precision.
- Permite supervisar el estado de lotes antes de enviar un perito, con costo marginal por hectarea muy bajo.
- Objetivo: peritaje mas eficiente, mejor decision de riesgo y apertura de nuevas lineas de negocio para bancos y aseguradoras.

## Deployment Notes

- Deploy to Vercel.
- Keep environment variables in Vercel Project Settings.
- Ensure Supabase Auth URL config includes:
  - Site URL: your deployed domain
  - Redirect URL: your deployed domain/auth/callback
- Apply Prisma migrations in the target DB before testing features.

## Useful Commands

```bash
# Dev server
npm run dev

# Lint
npm run lint

# Build
npm run build

# Start production build
npm run start
```

## Project Structure (Key Files)

- src/lib/prisma.ts: shared Prisma client.
- prisma/schema.prisma: data model.
- src/lib/auth/session.ts: session and role checks.
- src/lib/credit/engine.ts: credit scoring policy and reason codes.
- src/lib/prediction/predictClient.ts: prediction + valuation orchestration.
- src/app/api/cron/nightly-predictions/route.ts: scheduled prediction refresh.
- api/py/predict.py: Python inference endpoint.

## Known Operational Tips

- Prefer DATABASE_URL_POOLER for Prisma on networks where IPv6 can fail.
- If a table is missing at runtime, run migrations first before changing handlers.
- Keep business CRUD in Prisma, not direct Supabase table writes, for consistency.
