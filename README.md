# Ratin Hackitba

Base inicial con:

- Next.js (App Router)
- TypeScript
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- Auth con email/password (login, signup, logout y callback)
- Lista para deploy en Vercel

## 1) Instalar dependencias

```bash
npm install
```

## 2) Configurar Supabase

1. Crea un proyecto en Supabase.
1. Copia la URL del proyecto y la anon key.
1. Crea `.env.local` a partir de `.env.example`.

```bash
cp .env.example .env.local
```

Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# opcional para tareas admin en server only
SUPABASE_SERVICE_ROLE_KEY=...
```

Configura en Supabase (Authentication > URL Configuration):

- Site URL: `http://localhost:3000`
- Redirect URL adicional: `http://localhost:3000/auth/callback`

## 3) Crear tabla de ejemplo (opcional, recomendada)

En Supabase SQL Editor ejecuta:

```sql
create table if not exists public.todos (
  id bigint generated always as identity primary key,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "public can read todos"
on public.todos
for select
to anon
using (true);
```

Inserta uno de prueba:

```sql
insert into public.todos (title) values ('Primer todo desde Supabase');
```

## 4) Levantar Supabase local (opcional, recomendado)

Si prefieres correr Supabase en tu maquina:

1. Instala la CLI local en el proyecto:

```bash
npm install -D supabase
```

1. Inicializa (una sola vez):

```bash
npx supabase init
```

1. Levanta los servicios (requiere Docker):

```bash
npx supabase start
```

1. Obtiene URL y keys:

```bash
npx supabase status
```

Con esos datos, usa en `.env.local` algo como:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # from supabase status
SUPABASE_SERVICE_ROLE_KEY=... # from supabase status
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Para apagarlo:

```bash
npx supabase stop
```

## 5) Correr la app en local

```bash
npm run dev
```

Abre `http://localhost:3000`.

Flujo auth:

- `/auth` para iniciar sesion o registrarte.
- Confirmacion de email via `/auth/callback`.
- En home veras estado de sesion y boton de logout.

## 6) Deploy en Vercel

1. Sube el repo a GitHub.
1. Importa el proyecto en Vercel.
1. En Project Settings > Environment Variables agrega:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://tu-app.vercel.app
SUPABASE_SERVICE_ROLE_KEY=... # solo si lo necesitas en server
```

1. Deploy.

Ademas, en Supabase agrega el dominio de Vercel en Authentication > URL Configuration:

- Site URL: `https://tu-app.vercel.app`
- Redirect URL: `https://tu-app.vercel.app/auth/callback`

## Estructura relevante

- `src/lib/supabase/client.ts`: cliente para browser/client components.
- `src/lib/supabase/server.ts`: cliente para server components/route handlers.
- `src/lib/supabase/middleware.ts`: refresco de sesion en middleware.
- `src/middleware.ts`: hook global para auth cookies.
- `src/app/auth/page.tsx`: pantalla de login/registro.
- `src/app/auth/actions.ts`: server actions para sign in/up/out.
- `src/app/auth/callback/route.ts`: confirmacion de email y exchange de sesion.
- `src/types/database.ts`: tipos base de la DB (editable segun tu esquema).
