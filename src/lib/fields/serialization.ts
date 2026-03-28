import { z } from "zod";
import type {
  FieldPredictionSummary,
  FieldProfile,
  FieldRepayment,
  FieldRisk,
  FuturesValuationPoint,
  LiquidityLevel,
  RiskLevel,
  SoyFuturesContract,
} from "@/types/field";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

const revenueHistorySchema = z.array(
  z.object({
    month: z.string(),
    actual: z.number(),
    projected: z.number(),
  }),
);

const yieldHistorySchema = z.array(
  z.object({
    month: z.string(),
    value: z.number(),
  }),
);

const repaymentSchema = z.object({
  ratio: z.number(),
  liquidity: z.enum(["Alta", "Media", "Baja"]),
  debtToAsset: z.number(),
});

const riskSchema = z.object({
  climate: z.enum(["Bajo", "Medio", "Alto"]),
  market: z.enum(["Bajo", "Medio", "Alto"]),
  logistics: z.enum(["Bajo", "Medio", "Alto"]),
  climateScore: z.number(),
  marketScore: z.number(),
  logisticsScore: z.number(),
});

const futuresContractSchema = z.object({
  symbol: z.string(),
  label: z.string(),
  expiration: z.string(),
  priceUsdPerTon: z.number(),
});

const futuresValuationSchema = z.object({
  symbol: z.string(),
  label: z.string(),
  expiration: z.string(),
  priceUsdPerTon: z.number(),
  grossUsd: z.number(),
  netUsd: z.number(),
});

const predictionSnapshotSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  predictedYieldTonHa: z.number(),
  warning: z.string().nullable().optional(),
  spotPriceUsdPerTon: z.number(),
  costPerHaUsd: z.number(),
  grossSpotUsd: z.number(),
  netSpotUsd: z.number(),
  futuresContracts: z.array(futuresContractSchema),
  futuresValuations: z.array(futuresValuationSchema),
  createdAt: z.date(),
});

export type FieldRecord = {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  bboxMinLon: number | null;
  bboxMinLat: number | null;
  bboxMaxLon: number | null;
  bboxMaxLat: number | null;
  hectares: number;
  defaultCostPerHaUsd: number;
  score: number;
  scoreTrend: number;
  monthlyRevenueChange: number;
  revenueHistory: unknown;
  yieldHistory: unknown;
  repayment: unknown;
  risk: unknown;
  zone: string;
  createdAt: Date;
  predictionSnapshots?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    predictedYieldTonHa: number;
    warning: string | null;
    spotPriceUsdPerTon: number;
    costPerHaUsd: number;
    grossSpotUsd: number;
    netSpotUsd: number;
    futuresContracts: unknown;
    grossFuturesUsd: unknown;
    netFuturesUsd: unknown;
    createdAt: Date;
  }>;
};

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function seeded(seed: number, min: number, max: number) {
  const value = Math.sin(seed) * 10_000;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "Bajo";
  }

  if (score >= 45) {
    return "Medio";
  }

  return "Alto";
}

function toLiquidityLevel(ratio: number): LiquidityLevel {
  if (ratio >= 1.8) {
    return "Alta";
  }

  if (ratio >= 1.2) {
    return "Media";
  }

  return "Baja";
}

export function buildFieldStats(name: string, hectares: number) {
  const seedBase = hashString(`${name}-${hectares}`);
  const baseRevenue = Math.round(hectares * seeded(seedBase + 7, 85, 145));

  const revenueHistory: FieldProfile["revenueHistory"] = MONTHS.map((month, index) => {
    const seasonality = Math.sin((index / 12) * Math.PI * 2);
    const actualFactor = 1 + seasonality * 0.18 + seeded(seedBase + index * 11, -0.08, 0.08);
    const projectedFactor = 1 + seasonality * 0.14;

    return {
      month,
      actual: Math.max(0, Math.round(baseRevenue * actualFactor)),
      projected: Math.max(0, Math.round(baseRevenue * projectedFactor)),
    };
  });

  const yieldHistory: FieldProfile["yieldHistory"] = MONTHS.map((month, index) => {
    const base = seeded(seedBase + index * 17, 2.2, 5.8);
    return {
      month,
      value: Number(base.toFixed(2)),
    };
  });

  const latest = revenueHistory[revenueHistory.length - 1]?.actual ?? 0;
  const previous = revenueHistory[revenueHistory.length - 2]?.actual ?? latest;
  const monthlyRevenueChange = Number((((latest - previous) / Math.max(previous, 1)) * 100).toFixed(1));

  const score = Math.round(seeded(seedBase + 71, 52, 94));
  const scoreTrend = Math.round(seeded(seedBase + 73, -8, 8));

  const climateScore = Math.round(seeded(seedBase + 83, 25, 92));
  const marketScore = Math.round(seeded(seedBase + 89, 20, 88));
  const logisticsScore = Math.round(seeded(seedBase + 97, 28, 95));

  const ratio = Number(seeded(seedBase + 101, 0.9, 2.2).toFixed(1));
  const debtToAsset = Number(seeded(seedBase + 103, 0.12, 0.62).toFixed(2));

  const repayment: FieldRepayment = {
    ratio,
    liquidity: toLiquidityLevel(ratio),
    debtToAsset,
  };

  const risk: FieldRisk = {
    climate: toRiskLevel(climateScore),
    market: toRiskLevel(marketScore),
    logistics: toRiskLevel(logisticsScore),
    climateScore,
    marketScore,
    logisticsScore,
  };

  return {
    score,
    scoreTrend,
    monthlyRevenueChange,
    revenueHistory,
    yieldHistory,
    repayment,
    risk,
  };
}

function parseWithFallback<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function buildLatestPredictionSummary(record: FieldRecord): FieldPredictionSummary | null {
  const latestSnapshot = record.predictionSnapshots?.[0];

  if (!latestSnapshot) {
    return null;
  }

  const futuresContracts = parseWithFallback<SoyFuturesContract[]>(
    z.array(futuresContractSchema),
    latestSnapshot.futuresContracts,
    [],
  );
  const grossFuturesBySymbol = parseWithFallback<Record<string, number>>(
    z.record(z.string(), z.number()),
    latestSnapshot.grossFuturesUsd,
    {},
  );
  const netFuturesBySymbol = parseWithFallback<Record<string, number>>(
    z.record(z.string(), z.number()),
    latestSnapshot.netFuturesUsd,
    {},
  );

  const futuresValuations: FuturesValuationPoint[] = futuresContracts.map((contract) => {
    const fallbackGross = Number((latestSnapshot.predictedYieldTonHa * contract.priceUsdPerTon).toFixed(2));
    const grossUsd = Number((grossFuturesBySymbol[contract.symbol] ?? fallbackGross).toFixed(2));
    const netUsd = Number(
      (
        netFuturesBySymbol[contract.symbol] ??
        grossUsd - latestSnapshot.costPerHaUsd * record.hectares
      ).toFixed(2),
    );

    return {
      symbol: contract.symbol,
      label: contract.label,
      expiration: contract.expiration,
      priceUsdPerTon: contract.priceUsdPerTon,
      grossUsd,
      netUsd,
    };
  });

  const parsedSnapshot = predictionSnapshotSchema.parse({
    id: latestSnapshot.id,
    startDate: latestSnapshot.startDate,
    endDate: latestSnapshot.endDate,
    predictedYieldTonHa: latestSnapshot.predictedYieldTonHa,
    warning: latestSnapshot.warning,
    spotPriceUsdPerTon: latestSnapshot.spotPriceUsdPerTon,
    costPerHaUsd: latestSnapshot.costPerHaUsd,
    grossSpotUsd: latestSnapshot.grossSpotUsd,
    netSpotUsd: latestSnapshot.netSpotUsd,
    futuresContracts,
    futuresValuations,
    createdAt: latestSnapshot.createdAt,
  });

  return {
    snapshotId: parsedSnapshot.id,
    startDate: parsedSnapshot.startDate,
    endDate: parsedSnapshot.endDate,
    predictedYieldTonHa: Number(parsedSnapshot.predictedYieldTonHa.toFixed(3)),
    warning: parsedSnapshot.warning ?? undefined,
    spotPriceUsdPerTon: Number(parsedSnapshot.spotPriceUsdPerTon.toFixed(2)),
    costPerHaUsd: Number(parsedSnapshot.costPerHaUsd.toFixed(2)),
    grossSpotUsd: Number(parsedSnapshot.grossSpotUsd.toFixed(2)),
    netSpotUsd: Number(parsedSnapshot.netSpotUsd.toFixed(2)),
    futuresContracts: parsedSnapshot.futuresContracts,
    futuresValuations: parsedSnapshot.futuresValuations,
    createdAt: parsedSnapshot.createdAt.toISOString(),
  };
}

export function serializeField(field: FieldRecord): FieldProfile {
  const defaults = buildFieldStats(field.name, field.hectares);

  return {
    id: field.id,
    name: field.name,
    location: field.location,
    latitude: field.latitude,
    longitude: field.longitude,
    bboxMinLon: field.bboxMinLon,
    bboxMinLat: field.bboxMinLat,
    bboxMaxLon: field.bboxMaxLon,
    bboxMaxLat: field.bboxMaxLat,
    hectares: field.hectares,
    defaultCostPerHaUsd: Number(field.defaultCostPerHaUsd.toFixed(2)),
    score: field.score,
    scoreTrend: field.scoreTrend,
    monthlyRevenueChange: field.monthlyRevenueChange,
    revenueHistory: parseWithFallback(revenueHistorySchema, field.revenueHistory, defaults.revenueHistory),
    yieldHistory: parseWithFallback(yieldHistorySchema, field.yieldHistory, defaults.yieldHistory),
    repayment: parseWithFallback(repaymentSchema, field.repayment, defaults.repayment),
    risk: parseWithFallback(riskSchema, field.risk, defaults.risk),
    zone: field.zone,
    createdAt: field.createdAt.toISOString().slice(0, 10),
    latestPrediction: buildLatestPredictionSummary(field),
  };
}
