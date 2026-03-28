import Link from "next/link";

const features = [
  {
    title: "Seguimiento de campos",
    description: "Organiza cada lote con su historial y estado para tomar mejores decisiones.",
  },
  {
    title: "Estadisticas accionables",
    description: "Visualiza tendencias clave y detecta riesgos antes de que impacten la produccion.",
  },
  {
    title: "Base para multiusuario",
    description: "Sesion por usuario para separar datos y escalar a paneles personalizados.",
  },
];

export default function HomePresentationPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-100 via-lime-50 to-amber-50 px-6 py-10 text-zinc-900 sm:px-10">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-emerald-200/60 bg-white/80 shadow-2xl backdrop-blur">
        <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div>
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Field Insights
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-emerald-950 sm:text-5xl">
              Gestiona tus campos con una experiencia enfocada en resultados.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
              Esta vista publica vive en <span className="font-semibold">/home</span>. Al iniciar sesion, cada usuario entra a su
              <span className="font-semibold"> /dashboard</span> para consultar y agregar sus campos.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Crear cuenta
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-zinc-300 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
              >
                Ir al dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
            <h2 className="text-lg font-bold text-emerald-900">Que habilita este flujo</h2>
            <ul className="mt-4 space-y-4">
              {features.map((feature) => (
                <li key={feature.title} className="rounded-xl border border-emerald-100 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-emerald-900">{feature.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}