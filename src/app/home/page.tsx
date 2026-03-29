import Link from "next/link";

const keyMetrics = [
  {
    value: "70%",
    label: "de la soja en campos alquilados",
    detail: "Muchos productores quedan fuera del credito tradicional por no tener escritura como garantia.",
  },
  {
    value: "2-5 USD",
    label: "por hectarea en peritaje presencial",
    detail: "El costo de auditar en terreno escala demasiado rapido en operaciones grandes.",
  },
  {
    value: "10B USD",
    label: "mercado subatendido estimado",
    detail: "Capital que no se coloca por falta de evaluacion de riesgo granular y continua.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Ingesta satelital y meteorologica",
    description:
      "Procesamos datos de misiones satelitales y variables climaticas para estimar el estado productivo real de cada lote.",
  },
  {
    step: "02",
    title: "Motor de rendimiento y riesgo",
    description:
      "Nuestro modelo proyecta rendimiento actual/futuro y lo combina con senales de mercado, clima y estructura financiera.",
  },
  {
    step: "03",
    title: "Decision financiera accionable",
    description:
      "Entregamos scoring explicable, razones de decision y monitoreo continuo para bancos y aseguradoras.",
  },
];

const buyerValue = [
  "Reduce costos de peritaje al priorizar visitas solo donde el riesgo lo justifica.",
  "Mejora la precision del underwriting al pasar de analisis regional a analisis por lote.",
  "Acelera aprobaciones y habilita credito para productores sin activos tradicionales.",
];

export default function HomePresentationPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#d9f99d_0%,transparent_38%),radial-gradient(circle_at_85%_20%,#a7f3d0_0%,transparent_32%),linear-gradient(160deg,#f0fdf4_0%,#fefce8_45%,#fffbeb_100%)] px-6 py-10 text-zinc-900 sm:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-white/85 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
            <div>
              <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-900">
                Agri Fintech Intelligence
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-emerald-950 sm:text-5xl">
                SoyGuardian transforma riesgo agronomico en decisiones de credito claras.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
                Ayudamos a bancos y aseguradoras a evaluar cada lote de soja con evidencia satelital, climatica y financiera.
                Pasamos de peritajes caros y lentos a una evaluacion continua, explicable y escalable.
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
                  Ver dashboard
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-900 p-6 text-zinc-50">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Resumen ejecutivo</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-white">Por que existe SoyGuardian</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                La banca agro necesita evaluar mejor sin depender solo de garantias tradicionales. Nuestro modelo permite estimar
                rendimiento y riesgo de inversion por lote, incluso en campos alquilados.
              </p>
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">Resultado esperado</p>
                <p className="mt-1 text-sm text-emerald-100">
                  Menor incertidumbre de colocacion, mayor velocidad de decision y expansion de cartera con trazabilidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {keyMetrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-emerald-200/70 bg-white/90 p-5 shadow-sm">
              <p className="text-3xl font-black text-emerald-900">{metric.value}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">{metric.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-amber-200/70 bg-white/85 p-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Como funciona</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-zinc-900">Del dato satelital a la decision financiera</h2>
            <div className="mt-6 space-y-4">
              {workflow.map((item) => (
                <article key={item.step} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-bold tracking-[0.2em] text-emerald-700">STEP {item.step}</p>
                  <h3 className="mt-1 text-lg font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="text-xl font-black text-zinc-900">Impacto para bancos y aseguradoras</h3>
            <ul className="mt-4 space-y-3">
              {buyerValue.map((item) => (
                <li key={item} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              En el prototipo actual, el modelo de prediccion logra aproximadamente 72% de precision y se integra con scoring
              explicable para decision de riesgo.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}