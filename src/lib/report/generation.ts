import type { FieldReportContext } from "@/lib/report/context";
import { runWebSearch, type WebSearchCitation } from "@/lib/report/webSearch";

export type UnderwritingVerdict = "APPROVE_WITH_CONDITIONS" | "WATCHLIST" | "DECLINE";

export type GeneratedLenderReport = {
  provider: {
    name: "groq" | "fallback-template";
    model: string;
    usedWebSearch: boolean;
  };
  headline: string;
  underwritingVerdict: UnderwritingVerdict;
  executiveSummary: string;
  riskFlags: string[];
  recommendation: string;
  narrative: string[];
  financialHighlights: string[];
  scenarioAnalysis: {
    baseCase: string;
    downsideCase: string;
    upsideCase: string;
  };
  actions: string[];
  citations: WebSearchCitation[];
  generatedAt: string;
};

type GenerateLenderReportInput = {
  context: FieldReportContext;
  includeWebSearch?: boolean;
  model?: string;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type DerivedInsights = {
  yieldDeltaVsHistoryPct: number | null;
  yieldStabilityCoeff: number | null;
  netMarginPct: number | null;
  repaymentCoverageProxy: number | null;
  ndviSignal: "weak" | "neutral" | "strong" | "unknown";
  weatherStress: "low" | "moderate" | "high" | "unknown";
  confidenceBand: "low" | "medium" | "high";
};

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const avg = average(values);

  if (avg === null || values.length < 2) {
    return null;
  }

  const variance = average(values.map((value) => (value - avg) ** 2));

  if (variance === null) {
    return null;
  }

  return Math.sqrt(variance);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function deriveInsights(context: FieldReportContext): DerivedInsights {
  const latest = context.yield.latestSnapshot;
  const historicalValues = context.yield.historicalYieldSeries.map((point) => point.value).filter((value) => Number.isFinite(value));
  const historicalAvg = average(historicalValues);
  const historicalStd = standardDeviation(historicalValues);

  const yieldDeltaVsHistoryPct =
    latest && historicalAvg && historicalAvg > 0
      ? round(((latest.predictedYieldTonHa - historicalAvg) / historicalAvg) * 100, 1)
      : null;

  const yieldStabilityCoeff =
    historicalStd !== null && historicalAvg !== null && historicalAvg !== 0
      ? round(historicalStd / Math.abs(historicalAvg), 3)
      : null;

  const netMarginPct =
    latest && latest.grossSpotUsd > 0
      ? round((latest.netSpotUsd / latest.grossSpotUsd) * 100, 1)
      : null;

  const repaymentCoverageProxy =
    latest && latest.costPerHaUsd > 0 && context.field.hectares > 0
      ? round(latest.netSpotUsd / (latest.costPerHaUsd * context.field.hectares), 2)
      : null;

  const ndviAvg = context.liveFeatures?.ndvi.avg ?? null;
  const ndviSignal: DerivedInsights["ndviSignal"] =
    ndviAvg === null ? "unknown" : ndviAvg < 0.3 ? "weak" : ndviAvg < 0.55 ? "neutral" : "strong";

  const weatherScore = context.weather?.metrics.riskScore ?? null;
  const weatherStress: DerivedInsights["weatherStress"] =
    weatherScore === null ? "unknown" : weatherScore >= 70 ? "high" : weatherScore >= 45 ? "moderate" : "low";

  const confidenceBand: DerivedInsights["confidenceBand"] =
    context.completeness.score >= 0.85 ? "high" : context.completeness.score >= 0.6 ? "medium" : "low";

  return {
    yieldDeltaVsHistoryPct,
    yieldStabilityCoeff,
    netMarginPct,
    repaymentCoverageProxy,
    ndviSignal,
    weatherStress,
    confidenceBand,
  };
}

function buildQueries(context: FieldReportContext) {
  const location = context.field.location || context.field.zone || "Argentina";
  const currentYear = new Date().getUTCFullYear();

  return [
    `soybean market outlook ${currentYear}`,
    `agricultural weather risk ${location}`,
    "agricultural credit underwriting best practices",
  ];
}

function uniqueCitations(citations: WebSearchCitation[]) {
  const seen = new Set<string>();
  const output: WebSearchCitation[] = [];

  for (const citation of citations) {
    if (seen.has(citation.url)) {
      continue;
    }

    seen.add(citation.url);
    output.push(citation);
  }

  return output;
}

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return raw.slice(start, end + 1);
}

function parseVerdict(value: unknown): UnderwritingVerdict {
  if (value === "APPROVE_WITH_CONDITIONS" || value === "WATCHLIST" || value === "DECLINE") {
    return value;
  }

  return "WATCHLIST";
}

function buildFallbackReport(context: FieldReportContext, citations: WebSearchCitation[]): GeneratedLenderReport {
  const prediction = context.yield.latestSnapshot;
  const weatherRisk = context.weather?.metrics.riskScore;
  const credit = context.credit;
  const insights = deriveInsights(context);

  const riskFlags: string[] = [];

  if (!prediction) {
    riskFlags.push("No latest yield prediction snapshot is available.");
  }

  if (weatherRisk !== undefined && weatherRisk !== null && weatherRisk > 70) {
    riskFlags.push(`Recent weather risk is elevated (${weatherRisk}/100).`);
  }

  if (credit && credit.decision === "REJECTED") {
    riskFlags.push(`Latest credit engine decision is rejected (score ${credit.score}).`);
  }

  if (riskFlags.length === 0) {
    riskFlags.push("No critical risk flags detected from available internal data.");
  }

  const verdict: UnderwritingVerdict =
    credit?.decision === "REJECTED" || (weatherRisk !== null && weatherRisk !== undefined && weatherRisk > 75)
      ? "DECLINE"
      : insights.repaymentCoverageProxy !== null && insights.repaymentCoverageProxy >= 1
        ? "APPROVE_WITH_CONDITIONS"
        : "WATCHLIST";

  const headline =
    verdict === "APPROVE_WITH_CONDITIONS"
      ? "Perfil financiable con covenants operativos"
      : verdict === "WATCHLIST"
        ? "Perfil intermedio, requiere monitoreo reforzado"
        : "Perfil con riesgo elevado para originación";

  const executiveSummary = prediction
    ? `Field ${context.field.name} shows ${prediction.predictedYieldTonHa} ton/ha with net spot projection of USD ${prediction.netSpotUsd.toFixed(2)}. Completeness score is ${context.completeness.score}.`
    : `Field ${context.field.name} has incomplete prediction data. Completeness score is ${context.completeness.score}.`;

  const recommendation = credit?.decision === "APPROVED"
    ? "Proceed to conditional approval with weather and market monitoring covenants."
    : "Require additional guarantees or reject until risk profile improves.";

  const narrative = [
    `Cobertura de datos: ${(context.completeness.score * 100).toFixed(0)}%.`,
    `Señal NDVI: ${insights.ndviSignal}. Estrés climático: ${insights.weatherStress}.`,
    `Contexto crediticio: ${credit ? `${credit.decision} (${credit.score.toFixed(1)})` : "sin decisión previa"}.`,
    "Reporte generado en modo deterministic fallback por indisponibilidad o formato inválido del proveedor LLM.",
  ];

  const financialHighlights = [
    prediction ? `Yield estimado: ${prediction.predictedYieldTonHa.toFixed(2)} ton/ha.` : "Yield estimado: no disponible.",
    prediction ? `Proyección neta spot: USD ${prediction.netSpotUsd.toFixed(0)}.` : "Proyección neta spot: no disponible.",
    insights.netMarginPct !== null ? `Margen neto implícito: ${insights.netMarginPct.toFixed(1)}%.` : "Margen neto implícito: no disponible.",
    insights.repaymentCoverageProxy !== null
      ? `Cobertura de repago (proxy): ${insights.repaymentCoverageProxy.toFixed(2)}x.`
      : "Cobertura de repago (proxy): no disponible.",
  ];

  const scenarioAnalysis = {
    baseCase: prediction
      ? `Con yield de ${prediction.predictedYieldTonHa.toFixed(2)} ton/ha y spot actual, el flujo neto esperado es USD ${prediction.netSpotUsd.toFixed(0)}.`
      : "Sin snapshot reciente no se puede cuantificar escenario base con precisión.",
    downsideCase:
      "Con shock climático o caída de precio de soja, el perfil podría perder cobertura de servicio de deuda; requerir garantías adicionales.",
    upsideCase:
      "Con clima benigno y continuidad de precios, la capacidad de pago mejoraría con margen para reducción de riesgo percibido.",
  };

  const actions = [
    "Exigir covenant de monitoreo climático quincenal.",
    "Actualizar predicción satelital antes de desembolso.",
    "Definir trigger de revisión por deterioro de precio spot.",
  ];

  return {
    provider: {
      name: "fallback-template",
      model: "deterministic-v1",
      usedWebSearch: citations.length > 0,
    },
    headline,
    underwritingVerdict: verdict,
    executiveSummary,
    riskFlags,
    recommendation,
    narrative,
    financialHighlights,
    scenarioAnalysis,
    actions,
    citations,
    generatedAt: new Date().toISOString(),
  };
}

async function callGroqModel(
  context: FieldReportContext,
  citations: WebSearchCitation[],
  model: string,
  insights: DerivedInsights,
): Promise<GeneratedLenderReport | null> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const systemPrompt = [
    "You are a senior agricultural credit analyst producing bank-ready underwriting memos.",
    "Interpolate the internal numeric signals to infer coherent financial dynamics, but never fabricate raw values.",
    "Internal data is source-of-truth. External web findings are secondary and must be cited.",
    "Use concise, professional language suitable for credit committee review.",
    "Return strict JSON with keys:",
    "headline (string),",
    "underwritingVerdict ('APPROVE_WITH_CONDITIONS'|'WATCHLIST'|'DECLINE'),",
    "executiveSummary (string),",
    "riskFlags (string[]),",
    "recommendation (string),",
    "narrative (string[]),",
    "financialHighlights (string[]),",
    "scenarioAnalysis ({baseCase:string,downsideCase:string,upsideCase:string}),",
    "actions (string[]).",
    "Narrative/actions should be concrete and not generic.",
    "Do not include markdown fences.",
  ].join(" ");

  const userPrompt = {
    audience: "bank-underwriting",
    task: "Generate a lender-grade report that explains implications and interpolates relationships between yield, cost, weather, NDVI and credit signals.",
    context,
    derivedInsights: insights,
    webCitations: citations,
    constraints: {
      maxRiskFlags: 5,
      maxNarrativePoints: 5,
      maxActions: 4,
      includeDownsideLanguage: true,
      mentionDataCompleteness: true,
    },
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => ({}))) as GroqChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    return null;
  }

  const jsonChunk = extractFirstJsonObject(content);

  if (!jsonChunk) {
    return null;
  }

  const parsed = JSON.parse(jsonChunk) as {
    headline?: unknown;
    underwritingVerdict?: unknown;
    executiveSummary?: unknown;
    riskFlags?: unknown;
    recommendation?: unknown;
    narrative?: unknown;
    financialHighlights?: unknown;
    scenarioAnalysis?: unknown;
    actions?: unknown;
  };

  if (
    typeof parsed.headline !== "string" ||
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.riskFlags) ||
    typeof parsed.recommendation !== "string" ||
    !Array.isArray(parsed.narrative) ||
    !Array.isArray(parsed.financialHighlights) ||
    !parsed.scenarioAnalysis ||
    typeof parsed.scenarioAnalysis !== "object" ||
    !Array.isArray(parsed.actions)
  ) {
    return null;
  }

  const riskFlags = parsed.riskFlags
    .filter((item): item is string => typeof item === "string")
    .slice(0, 5);

  const narrative = parsed.narrative
    .filter((item): item is string => typeof item === "string")
    .slice(0, 5);

  const financialHighlights = parsed.financialHighlights
    .filter((item): item is string => typeof item === "string")
    .slice(0, 6);

  const actions = parsed.actions
    .filter((item): item is string => typeof item === "string")
    .slice(0, 4);

  const scenarioAnalysis = parsed.scenarioAnalysis as {
    baseCase?: unknown;
    downsideCase?: unknown;
    upsideCase?: unknown;
  };

  if (
    typeof scenarioAnalysis.baseCase !== "string" ||
    typeof scenarioAnalysis.downsideCase !== "string" ||
    typeof scenarioAnalysis.upsideCase !== "string"
  ) {
    return null;
  }

  return {
    provider: {
      name: "groq",
      model,
      usedWebSearch: citations.length > 0,
    },
    headline: parsed.headline,
    underwritingVerdict: parseVerdict(parsed.underwritingVerdict),
    executiveSummary: parsed.executiveSummary,
    riskFlags,
    recommendation: parsed.recommendation,
    narrative,
    financialHighlights,
    scenarioAnalysis: {
      baseCase: scenarioAnalysis.baseCase,
      downsideCase: scenarioAnalysis.downsideCase,
      upsideCase: scenarioAnalysis.upsideCase,
    },
    actions,
    citations,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateLenderReport(input: GenerateLenderReportInput): Promise<GeneratedLenderReport> {
  const useWebSearch = input.includeWebSearch !== false;
  const model = input.model ?? process.env.GROQ_REPORT_MODEL ?? "llama-3.3-70b-versatile";
  const insights = deriveInsights(input.context);

  const citations: WebSearchCitation[] = [];

  if (useWebSearch) {
    const queries = buildQueries(input.context);

    const searchResults = await Promise.all(
      queries.map((query) =>
        runWebSearch({
          query,
          maxResults: 3,
        }),
      ),
    );

    citations.push(...uniqueCitations(searchResults.flat()).slice(0, 8));
  }

  try {
    const modelReport = await callGroqModel(input.context, citations, model, insights);

    if (modelReport) {
      return modelReport;
    }
  } catch (error) {
    console.warn("[REPORT][LLM] Groq generation failed, fallback will be used.", error);
  }

  return buildFallbackReport(input.context, citations);
}
