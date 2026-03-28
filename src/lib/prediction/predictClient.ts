import type { SoyFuturesContract } from "@/types/field";

type PredictPythonResponse = {
  predictions?: unknown;
  warning?: string;
};

type PredictFromBboxInput = {
  origin: string;
  bbox: [number, number, number, number];
  startDate: string;
  endDate: string;
  cookieHeader?: string;
};

type PredictFromBboxResult = {
  predictedYieldTonHa: number;
  warning?: string;
};

type ValuationInput = {
  hectares: number;
  predictedYieldTonHa: number;
  spotPriceUsdPerTon: number;
  futuresContracts: SoyFuturesContract[];
  costPerHaUsd: number;
};

type ValuationResult = {
  grossSpotUsd: number;
  netSpotUsd: number;
  grossFuturesUsd: Record<string, number>;
  netFuturesUsd: Record<string, number>;
};

function parsePredictionValue(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "number" && Number.isFinite(raw[0])) {
    return raw[0];
  }

  return null;
}

export async function predictYieldFromBbox(input: PredictFromBboxInput): Promise<PredictFromBboxResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (input.cookieHeader) {
    headers.Cookie = input.cookieHeader;
  }

  console.log(`[PREDICTION] Sending request to prediction API with bbox: ${input.bbox} and date range: ${input.startDate} to ${input.endDate}`);

  const response = await fetch(`https://null-profits-jet.vercel.app/predict`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      bbox: input.bbox,
      start_date: input.startDate,
      end_date: input.endDate,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as PredictPythonResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Prediction API error: ${JSON.stringify(payload)}`);
  }
  console.log(`[PREDICTION] Received response from prediction API:`, payload);
  const predictedYieldTonHa = parsePredictionValue(payload.predictions);

  if (predictedYieldTonHa === null) {
    throw new Error("La API de prediccion devolvio un formato invalido.");
  }

  return {
    predictedYieldTonHa: Number(predictedYieldTonHa.toFixed(3)),
    warning: payload.warning,
  };
}

export function calculateValuation(input: ValuationInput): ValuationResult {
  const tonsTotal = input.predictedYieldTonHa * input.hectares;
  const totalCostUsd = input.costPerHaUsd * input.hectares;

  const grossSpotUsd = Number((tonsTotal * input.spotPriceUsdPerTon).toFixed(2));
  const netSpotUsd = Number((grossSpotUsd - totalCostUsd).toFixed(2));

  const grossFuturesUsd: Record<string, number> = {};
  const netFuturesUsd: Record<string, number> = {};

  for (const contract of input.futuresContracts) {
    const grossValue = Number((tonsTotal * contract.priceUsdPerTon).toFixed(2));
    grossFuturesUsd[contract.symbol] = grossValue;
    netFuturesUsd[contract.symbol] = Number((grossValue - totalCostUsd).toFixed(2));
  }

  return {
    grossSpotUsd,
    netSpotUsd,
    grossFuturesUsd,
    netFuturesUsd,
  };
}
