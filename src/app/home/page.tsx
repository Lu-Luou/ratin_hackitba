import Link from "next/link";

const tensionStats = [
  {
    value: "70%",
    label: "de la soja vive en campos alquilados",
    detail: "Sin escritura como garantia, miles de productores quedan fuera del credito formal.",
  },
  {
    value: "2-5 USD",
    label: "por hectarea en peritaje presencial",
    detail: "El analisis fisico escala mal y frena la velocidad comercial de bancos y aseguradoras.",
  },
  {
    value: "10B USD",
    label: "mercado subatendido en LatAm",
    detail: "Capital disponible que hoy no se coloca por falta de evaluacion de riesgo por lote.",
  },
];

const storyActs = [
  {
    chapter: "Acto 1",
    title: "El problema",
    description: "La banca agro decide con poca granularidad y mucho costo operativo.",
  },
  {
    chapter: "Acto 2",
    title: "La evidencia",
    description: "Cada lote deja huellas objetivas en clima, satelite y productividad historica.",
  },
  {
    chapter: "Acto 3",
    title: "La decision",
    description: "Convertimos esas senales en score, razones y alertas para decidir mejor y mas rapido.",
  },
];

const engineSteps = [
  {
    step: "01",
    title: "Lectura continua del lote",
    description: "Integramos observacion satelital, clima y contexto productivo en una sola capa operativa.",
  },
  {
    step: "02",
    title: "Prediccion + scoring explicable",
    description: "Estimamos rendimiento y riesgo con variables trazables, no con una caja negra opaca.",
  },
  {
    step: "03",
    title: "Alerta y accion",
    description: "El dashboard prioriza casos, explica impacto y sugiere proximos pasos para underwriting.",
  },
];

const judgeTakeaways = [
  "Pasamos de riesgo por region a riesgo por lote, con trazabilidad de variables.",
  "Reducimos costo operativo de peritaje al visitar solo donde la alerta lo amerita.",
  "Aceleramos decision crediticia en productores sin garantia tradicional.",
  "Creamos monitoreo vivo, no una foto estatica de onboarding.",
];

export default function HomePresentationPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,#fde68a_0%,transparent_34%),radial-gradient(circle_at_88%_14%,#86efac_0%,transparent_30%),linear-gradient(170deg,#f7fee7_0%,#fef9c3_38%,#ffedd5_100%)] px-6 py-10 text-zinc-900 sm:px-10 sm:py-12">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white/85 shadow-[0_28px_90px_-34px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
            <div>
              <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-900">
                Pitch Mode | SoyGuardian
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                De incertidumbre rural a decisiones de credito defendibles.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
                SoyGuardian cuenta una historia simple: donde antes habia intuicion, ahora hay evidencia por lote. Combinamos
                satelite, clima y finanzas para que bancos y aseguradoras aprueben mas rapido, con menor riesgo.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
                >
                  Ver demo en vivo
                </Link>
                <Link
                  href="/assistant"
                  className="rounded-xl border border-emerald-300 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 hover:bg-emerald-200"
                >
                  Simular decision asistida
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-400"
                >
                  Ingresar
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-50">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">La historia en 3 actos</p>
              <div className="mt-4 space-y-3">
                {storyActs.map((act) => (
                  <article key={act.chapter} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">{act.chapter}</p>
                    <h2 className="mt-1 text-base font-black text-white">{act.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-300">{act.description}</p>
                  </article>
                ))}
              </div>
              <p className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-100">
                Objetivo para el jurado: validar que nuestra arquitectura convierte datos complejos en decisiones ejecutables.
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {tensionStats.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-amber-300/55 bg-white/90 p-5 shadow-[0_12px_30px_-22px_rgba(113,63,18,0.55)] transition hover:-translate-y-1"
            >
              <p className="text-3xl font-black text-amber-700">{metric.value}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">{metric.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-emerald-300/60 bg-white/85 p-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Nuestro motor</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-zinc-900">Como transformamos senales en underwriting</h2>
            <div className="mt-6 space-y-4">
              {engineSteps.map((item) => (
                <article key={item.step} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-black tracking-[0.2em] text-emerald-700">STEP {item.step}</p>
                  <h3 className="mt-1 text-lg font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="text-xl font-black text-zinc-900">Que deberia ver el jurado</h3>
            <ul className="mt-4 space-y-3">
              {judgeTakeaways.map((item) => (
                <li key={item} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-3 text-zinc-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">Proof point</p>
              <p className="mt-1 text-sm leading-relaxed">
                El prototipo actual alcanza aproximadamente 72% de precision en prediccion de rendimiento y alimenta un score
                interpretable para riesgo crediticio.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-900/15 bg-white/85 p-8 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.55)]">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Cierre para presentacion</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-zinc-900">Menos friccion para prestar. Mas confianza para crecer cartera.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
                Este producto no reemplaza al analista: lo vuelve mas potente. SoyGuardian sirve como capa de inteligencia para
                priorizar, justificar y monitorear decisiones de credito agro en tiempo real.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/dashboard"
                className="rounded-xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Abrir dashboard
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}