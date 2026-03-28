import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signIn, signOut, signUp } from "@/app/auth/actions";

type AuthPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { message } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-12 text-zinc-100 sm:px-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-teal-400">
          Autenticacion
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Acceso con Supabase</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Usa email y password. Si te registras, revisa el correo para confirmar la cuenta.
        </p>

        {message ? (
          <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-800/70 p-3 text-sm text-zinc-100">
            {message}
          </div>
        ) : null}

        {user ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-black/30 p-5">
            <p className="text-sm text-zinc-300">Sesion activa:</p>
            <p className="mt-1 text-sm font-medium text-zinc-100">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-700"
              >
                Ir al inicio
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-full border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm text-teal-200 transition hover:bg-teal-500/20"
                >
                  Cerrar sesion
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <form action={signIn} className="rounded-xl border border-zinc-800 bg-black/30 p-5">
              <h2 className="text-lg font-medium">Entrar</h2>
              <label className="mt-4 block text-xs uppercase tracking-wide text-zinc-400" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-teal-400/30 placeholder:text-zinc-500 focus:ring"
                placeholder="tu@email.com"
              />
              <label className="mt-3 block text-xs uppercase tracking-wide text-zinc-400" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-teal-400/30 placeholder:text-zinc-500 focus:ring"
                placeholder="********"
              />
              <button
                type="submit"
                className="mt-4 w-full cursor-pointer rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-200 transition hover:bg-teal-500/20"
              >
                Iniciar sesion
              </button>
            </form>

            <form action={signUp} className="rounded-xl border border-zinc-800 bg-black/30 p-5">
              <h2 className="text-lg font-medium">Crear cuenta</h2>
              <label className="mt-4 block text-xs uppercase tracking-wide text-zinc-400" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-teal-400/30 placeholder:text-zinc-500 focus:ring"
                placeholder="tu@email.com"
              />
              <label className="mt-3 block text-xs uppercase tracking-wide text-zinc-400" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-teal-400/30 placeholder:text-zinc-500 focus:ring"
                placeholder="Minimo 6 caracteres"
              />
              <button
                type="submit"
                className="mt-4 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
              >
                Registrarse
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}