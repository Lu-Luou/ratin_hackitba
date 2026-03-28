export type RevenueHistoryPoint = {
  month: string;
  actual: number;
  projected: number;
};

export type YieldHistoryPoint = {
  month: string;
  value: number;
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
  hectares: number;
  score: number;
  scoreTrend: number;
  monthlyRevenueChange: number;
  revenueHistory: RevenueHistoryPoint[];
  yieldHistory: YieldHistoryPoint[];
  repayment: FieldRepayment;
  risk: FieldRisk;
  zone: string;
  createdAt: string;
}
