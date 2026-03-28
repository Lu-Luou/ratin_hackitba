import type { FieldReportContext } from "@/lib/report/context";
import { runWebSearch, type WebSearchCitation } from "@/lib/report/webSearch";

export type GeneratedLenderReport = {
  provider: {
    name: "groq" | "fallback-template";
    model: string;
    usedWebSearch: boolean;
  };
  executiveSummary: string;
  riskFlags: string[];
  recommendation: string;
  narrative: string;
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

function buildFallbackReport(context: FieldReportContext, citations: WebSearchCitation[]): GeneratedLenderReport {
  const prediction = context.yield.latestSnapshot;
  const weatherRisk = context.weather?.metrics.riskScore;
  const credit = context.credit;

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

  const executiveSummary = prediction
    ? `Field ${context.field.name} shows ${prediction.predictedYieldTonHa} ton/ha with net spot projection of USD ${prediction.netSpotUsd.toFixed(2)}. Completeness score is ${context.completeness.score}.`
    : `Field ${context.field.name} has incomplete prediction data. Completeness score is ${context.completeness.score}.`;

  const recommendation = credit?.decision === "APPROVED"
    ? "Proceed to conditional approval with weather and market monitoring covenants."
    : "Require additional guarantees or reject until risk profile improves.";

  const narrative = [
    "Internal data report generated without live LLM provider.",
    `Geo coverage includes bbox center at (${context.geo.center.lat ?? "n/a"}, ${context.geo.center.lon ?? "n/a"}).`,
    `Weather source: ${context.weather?.source ?? "none"}.`,
    `Credit context: ${credit ? `${credit.decision} (${credit.score})` : "not available"}.`,
    "Use this fallback output to maintain continuity while model credentials are configured.",
  ].join(" ");

  return {
    provider: {
      name: "fallback-template",
      model: "deterministic-v1",
      usedWebSearch: citations.length > 0,
    },
    executiveSummary,
    riskFlags,
    recommendation,
    narrative,
    citations,
    generatedAt: new Date().toISOString(),
  };
}

async function callGroqModel(context: FieldReportContext, citations: WebSearchCitation[], model: string): Promise<GeneratedLenderReport | null> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const systemPrompt = [
    "You are an agricultural credit analyst writing a lender memo for a bank-oriented fintech platform.",
    "Use internal data as primary source of truth.",
    "External web findings are supporting context only and must be cited.",
    "Return strict JSON with keys: executiveSummary (string), riskFlags (string[]), recommendation (string), narrative (string).",
    "Do not include markdown fences.",
  ].join(" ");

  const userPrompt = {
    audience: "bank-underwriting",
    task: "Generate a concise, factual report summary.",
    context,
    webCitations: citations,
    constraints: {
      maxRiskFlags: 5,
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
    executiveSummary?: unknown;
    riskFlags?: unknown;
    recommendation?: unknown;
    narrative?: unknown;
  };

  if (
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.riskFlags) ||
    typeof parsed.recommendation !== "string" ||
    typeof parsed.narrative !== "string"
  ) {
    return null;
  }

  const riskFlags = parsed.riskFlags
    .filter((item): item is string => typeof item === "string")
    .slice(0, 5);

  return {
    provider: {
      name: "groq",
      model,
      usedWebSearch: citations.length > 0,
    },
    executiveSummary: parsed.executiveSummary,
    riskFlags,
    recommendation: parsed.recommendation,
    narrative: parsed.narrative,
    citations,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateLenderReport(input: GenerateLenderReportInput): Promise<GeneratedLenderReport> {
  const useWebSearch = input.includeWebSearch !== false;
  const model = input.model ?? process.env.GROQ_REPORT_MODEL ?? "llama-3.3-70b-versatile";

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
    const modelReport = await callGroqModel(input.context, citations, model);

    if (modelReport) {
      return modelReport;
    }
  } catch (error) {
    console.warn("[REPORT][LLM] Groq generation failed, fallback will be used.", error);
  }

  return buildFallbackReport(input.context, citations);
}
