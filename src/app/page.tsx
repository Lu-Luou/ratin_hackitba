import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Todo = Database["public"]["Tables"]["todos"]["Row"];

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabaseEnv) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100 sm:px-10">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-teal-400">
            Next.js + Supabase
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Configura tus variables de entorno
          </h1>
          <p className="mt-4 text-zinc-300">
            Crea el archivo <code className="rounded bg-zinc-800 px-1.5 py-0.5">.env.local</code> usando <code className="rounded bg-zinc-800 px-1.5 py-0.5">.env.example</code> y vuelve a correr el proyecto.
          </p>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
            NEXT_PUBLIC_SUPABASE_URL=...<br />
            NEXT_PUBLIC_SUPABASE_ANON_KEY=...
          </div>
        </div>
      </main>
    );
  }

  let todos: Todo[] = [];
  let queryError: string | null = null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const { data, error } = await supabase
      .from("todos")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      queryError = error.message;
    } else {
      todos = data ?? [];
    }
  } catch (error) {
    queryError =
      error instanceof Error
        ? error.message
        : "No se pudo conectar con Supabase.";
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-12 text-zinc-100 sm:px-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-teal-400">
          Base de proyecto
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Next.js + TypeScript + Supabase + Vercel
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          Ya tienes un arranque con consulta de ejemplo a la tabla <code className="rounded bg-zinc-800 px-1.5 py-0.5">todos</code>. Si no existe, veras el error para crearla rapido desde Supabase SQL Editor.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
            <h2 className="text-sm font-medium text-zinc-200">Estado de conexion</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {queryError ? "Conectado, pero falta ajustar la tabla de ejemplo" : "Conectado y leyendo datos correctamente"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
            <h2 className="text-sm font-medium text-zinc-200">Variables requeridas</h2>
            <p className="mt-2 text-sm text-zinc-400">
              NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 sm:col-span-2">
            <h2 className="text-sm font-medium text-zinc-200">Autenticacion</h2>
            {user ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span>Sesion activa: {user.email}</span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-teal-200 transition hover:bg-teal-500/20"
                  >
                    Cerrar sesion
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span>No hay sesion iniciada.</span>
                <Link
                  href="/auth"
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-zinc-100 transition hover:bg-zinc-700"
                >
                  Iniciar sesion o crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>

        {queryError ? (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">Error de consulta:</p>
            <p className="mt-1">{queryError}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-zinc-800 bg-black/30 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Ultimos todos</h2>
          <ul className="mt-3 space-y-2">
            {todos.length === 0 ? (
              <li className="text-sm text-zinc-400">
                Sin registros aun. Inserta uno en Supabase para probar el flujo completo.
              </li>
            ) : (
              todos.map((todo) => (
                <li
                  key={todo.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                >
                  {todo.title}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-teal-200 transition hover:bg-teal-500/20"
          >
            Abrir Supabase
          </a>
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 transition hover:bg-zinc-700"
          >
            Deploy en Vercel
          </a>
        </div>
      </section>
    </main>
  );
}
