import { CreditDecisionOutcome } from "@/generated/prisma/client";
import { z } from "zod";
import type { WeatherData } from "@/lib/weather/provider";

type YieldHistoryPoint = {
  month: string;
  value: number;
};

type FieldCreditInput = {
  id: string;
  hectares: number;
  defaultCostPerHaUsd: number;
  repayment: unknown;
  risk: unknown;
  yieldHistory: unknown;
  predictionSnapshots: Array<{
    id: string;
    predictedYieldTonHa: number;
    netSpotUsd: number;
    createdAt: Date;
  }>;
  alertLinks: Array<{
    alert: {
      relevanceScore: number;
      priorityScore: number;
      issuedAt: Date;
    };
  }>;
};

type CreditEngineContext = {
  engineVersion: string;
  pricingSource: string;
  pricingFetchedAt: string;
  weatherData?: WeatherData;
};

type CreditFeatureSnapshot = {
  hectares: number;
  defaultCostPerHaUsd: number;
  predictedYieldTonHa: number | null;
  netSpotUsd: number | null;
  netSpotUsdPerHa: number | null;
  coverageRatio: number | null;
  repaymentRatio: number | null;
  debtToAsset: number | null;
  climateScore: number | null;
  marketScore: number | null;
  logisticsScore: number | null;
  alertCount30d: number;
  yieldStabilityCoefficient: number | null;
  dataCoverage: number;
  weatherRiskScore: number | null;
  weatherSource: "real-provider" | "stored-alerts" | "none";
};

type CreditSourceSnapshot = {
  predictionSource: "latest-snapshot" | "missing";
  weatherSource: string;
  pricingSource: string;
  pricingFetchedAt: string;
  engineVersion: string;
  weatherProvider?: string;
  weatherWarning?: string;
};

type CreditDecisionComputation = {
  outcome: CreditDecisionOutcome;
  score: number;
  confidence: number;
  decisionReason: string;
  reasonCodes: string[];
  featureSnapshot: CreditFeatureSnapshot;
  sourceSnapshot: CreditSourceSnapshot;
  predictionSnapshotId: string | null;
};

const repaymentSchema = z
  .object({
    ratio: z.number().finite().positive(),
    debtToAsset: z.number().finite().min(0),
  })
  .partial();

const riskSchema = z
  .object({
    climateScore: z.number().finite().min(0).max(100),
    marketScore: z.number().finite().min(0).max(100),
    logisticsScore: z.number().finite().min(0).max(100),
  })
  .partial();

const yieldHistorySchema = z.array(
  z.object({
    month: z.string(),
    value: z.number().finite(),
  }),
);

function toScore(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= min) {
    return 0;
  }

  if (value >= max) {
    return 100;
  }

  return ((value - min) / (max - min)) * 100;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const avg = average(values);

  if (avg === null) {
    return null;
  }

  const variance = average(values.map((value) => (value - avg) ** 2));

  if (variance === null) {
    return null;
  }

  return Math.sqrt(variance);
}

function normalizeCoefficient(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  const avg = average(values);
  const deviation = standardDeviation(values);

  if (avg === null || deviation === null || avg === 0) {
    return null;
  }

  return Number((deviation / Math.abs(avg)).toFixed(4));
}

export function computeCreditDecision(input: FieldCreditInput, context: CreditEngineContext): CreditDecisionComputation {
  const latestPrediction = input.predictionSnapshots[0] ?? null;
  const repaymentParsed = repaymentSchema.safeParse(input.repayment);
  const riskParsed = riskSchema.safeParse(input.risk);
  const yieldHistoryParsed = yieldHistorySchema.safeParse(input.yieldHistory);

  const now = Date.now();
  const millisIn30d = 30 * 24 * 60 * 60 * 1000;
  const recentAlerts = input.alertLinks
    .map((item) => item.alert)
    .filter((alert) => now - alert.issuedAt.getTime() <= millisIn30d);

  const alertPriorities = recentAlerts.map((alert) => alert.priorityScore);
  const avgAlertPriority30d = average(alertPriorities);

  // Prefer real weather provider, fall back to stored alerts if available
  let weatherRiskScore: number | null = null;
  let weatherSourceLabel: "real-provider" | "stored-alerts" | "none" = "none";
  let weatherProviderName = "";
  let weatherWarning: string | undefined;

  if (context.weatherData) {
    weatherRiskScore = context.weatherData.metrics.riskScore;
    weatherSourceLabel = "real-provider";
    weatherProviderName = context.weatherData.source;
    weatherWarning = context.weatherData.warning;
  } else if (avgAlertPriority30d !== null) {
    weatherRiskScore = avgAlertPriority30d;
    weatherSourceLabel = "stored-alerts";
    weatherProviderName = "database-alerts";
  }

  const yieldHistoryValues: number[] = yieldHistoryParsed.success
    ? yieldHistoryParsed.data.map((point: YieldHistoryPoint) => point.value)
    : [];
  const yieldStabilityCoefficient = normalizeCoefficient(yieldHistoryValues);

  const predictedYieldTonHa = latestPrediction?.predictedYieldTonHa ?? null;
  const netSpotUsd = latestPrediction?.netSpotUsd ?? null;
  const netSpotUsdPerHa = netSpotUsd !== null && input.hectares > 0 ? netSpotUsd / input.hectares : null;
  const coverageRatio =
    netSpotUsd !== null && input.hectares > 0 && input.defaultCostPerHaUsd > 0
      ? netSpotUsd / (input.defaultCostPerHaUsd * input.hectares)
      : null;

  const repaymentRatio = repaymentParsed.success ? (repaymentParsed.data.ratio ?? null) : null;
  const debtToAsset = repaymentParsed.success ? (repaymentParsed.data.debtToAsset ?? null) : null;
  const climateScore = riskParsed.success ? (riskParsed.data.climateScore ?? null) : null;
  const marketScore = riskParsed.success ? (riskParsed.data.marketScore ?? null) : null;
  const logisticsScore = riskParsed.success ? (riskParsed.data.logisticsScore ?? null) : null;

  const coverageScore = coverageRatio !== null ? toScore(coverageRatio, 0.1, 2.5) : 25;
  const repaymentScore = repaymentRatio !== null ? toScore(repaymentRatio, 0.9, 2.0) : 45;
  const leverageScore = debtToAsset !== null ? 100 - toScore(debtToAsset, 0.1, 0.8) : 50;
  const structuralRiskAverage = average([climateScore, marketScore, logisticsScore].filter((value): value is number => value !== null));
  const structuralRiskScore = structuralRiskAverage !== null ? 100 - structuralRiskAverage : 50;
  const weatherScore = weatherRiskScore !== null ? 100 - weatherRiskScore : 60;
  const stabilityScore = yieldStabilityCoefficient !== null ? 100 - toScore(yieldStabilityCoefficient, 0.05, 0.55) : 55;
  const scaleScore = toScore(input.hectares, 10, 500);

  const weightedScore =
    coverageScore * 0.28 +
    repaymentScore * 0.17 +
    leverageScore * 0.08 +
    structuralRiskScore * 0.17 +
    weatherScore * 0.12 +
    stabilityScore * 0.1 +
    scaleScore * 0.08;

  const score = Number(Math.max(0, Math.min(100, weightedScore)).toFixed(2));

  const availableSignals = [
    predictedYieldTonHa,
    netSpotUsd,
    coverageRatio,
    repaymentRatio,
    debtToAsset,
    climateScore,
    marketScore,
    logisticsScore,
    weatherRiskScore,
    yieldStabilityCoefficient,
  ].filter((value) => value !== null).length;
  const totalSignals = 10;
  const dataCoverage = Number((availableSignals / totalSignals).toFixed(3));
  const confidence = Number((Math.min(1, Math.max(0.3, dataCoverage)) * 100).toFixed(2));

  const reasonCodes: string[] = [];

  if (!latestPrediction) {
    reasonCodes.push("MISSING_PREDICTION_SNAPSHOT");
  }

  if (coverageRatio !== null && coverageRatio < 1) {
    reasonCodes.push("LOW_REVENUE_COST_COVERAGE");
  }

  if (repaymentRatio !== null && repaymentRatio < 1) {
    reasonCodes.push("LOW_REPAYMENT_RATIO");
  }

  if (debtToAsset !== null && debtToAsset > 0.6) {
    reasonCodes.push("HIGH_DEBT_TO_ASSET");
  }

  if (weatherRiskScore !== null && weatherRiskScore > 80) {
    reasonCodes.push("HIGH_RECENT_WEATHER_RISK");
  }

  if (structuralRiskAverage !== null && structuralRiskAverage > 75) {
    reasonCodes.push("HIGH_STRUCTURAL_RISK");
  }

  if (yieldStabilityCoefficient !== null && yieldStabilityCoefficient > 0.45) {
    reasonCodes.push("UNSTABLE_YIELD_HISTORY");
  }

  const autoReject =
    !latestPrediction ||
    (netSpotUsd !== null && netSpotUsd <= 0) ||
    (coverageRatio !== null && coverageRatio < 0.6) ||
    (weatherRiskScore !== null && weatherRiskScore > 90);

  const outcome = autoReject || score < 62 ? CreditDecisionOutcome.REJECTED : CreditDecisionOutcome.APPROVED;

  const decisionReason =
    outcome === CreditDecisionOutcome.APPROVED
      ? "Application approved by batch scoring policy."
      : "Application rejected by batch scoring policy.";

  return {
    outcome,
    score,
    confidence,
    decisionReason,
    reasonCodes,
    predictionSnapshotId: latestPrediction?.id ?? null,
    featureSnapshot: {
      hectares: input.hectares,
      defaultCostPerHaUsd: input.defaultCostPerHaUsd,
      predictedYieldTonHa,
      netSpotUsd,
      netSpotUsdPerHa: netSpotUsdPerHa === null ? null : Number(netSpotUsdPerHa.toFixed(2)),
      coverageRatio: coverageRatio === null ? null : Number(coverageRatio.toFixed(3)),
      repaymentRatio,
      debtToAsset,
      climateScore,
      marketScore,
      logisticsScore,
      alertCount30d: recentAlerts.length,
      yieldStabilityCoefficient,
      dataCoverage,
      weatherRiskScore: weatherRiskScore === null ? null : Number(weatherRiskScore.toFixed(2)),
      weatherSource: weatherSourceLabel,
    },
    sourceSnapshot: {
      predictionSource: latestPrediction ? "latest-snapshot" : "missing",
      weatherSource: `${weatherSourceLabel}${weatherProviderName ? `(${weatherProviderName})` : ""}`,
      pricingSource: context.pricingSource,
      pricingFetchedAt: context.pricingFetchedAt,
      engineVersion: context.engineVersion,
      weatherProvider: weatherProviderName,
      weatherWarning,
    },
  };
}
