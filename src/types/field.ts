export type RevenueHistoryPoint = {
  month: string;
  actual: number;
  projected: number;
};

export type YieldHistoryPoint = {
  month: string;
  value: number;
};

export type SoyFuturesContract = {
  symbol: string;
  label: string;
  expiration: string;
  priceUsdPerTon: number;
};

export type FuturesValuationPoint = {
  symbol: string;
  label: string;
  expiration: string;
  priceUsdPerTon: number;
  grossUsd: number;
  netUsd: number;
};

export type FieldPredictionSummary = {
  snapshotId: string;
  startDate: string;
  endDate: string;
  predictedYieldTonHa: number;
  warning?: string;
  spotPriceUsdPerTon: number;
  costPerHaUsd: number;
  grossSpotUsd: number;
  netSpotUsd: number;
  futuresContracts: SoyFuturesContract[];
  futuresValuations: FuturesValuationPoint[];
  createdAt: string;
};

export type LiquidityLevel = "Alta" | "Media" | "Baja";
export type RiskLevel = "Bajo" | "Medio" | "Alto";

export type FieldRepayment = {
  ratio: number;
  liquidity: LiquidityLevel;
  debtToAsset: number;
};

export type FieldRisk = {
  climate: RiskLevel;
  market: RiskLevel;
  logistics: RiskLevel;
  climateScore: number;
  marketScore: number;
  logisticsScore: number;
};

export interface FieldProfile {
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
  revenueHistory: RevenueHistoryPoint[];
  yieldHistory: YieldHistoryPoint[];
  repayment: FieldRepayment;
  risk: FieldRisk;
  zone: string;
  sortOrder: number;
  createdAt: string;
  latestPrediction: FieldPredictionSummary | null;
}
