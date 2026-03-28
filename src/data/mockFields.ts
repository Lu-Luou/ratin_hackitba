export interface FieldProfile {
  id: string;
  name: string;
  location: string;
  hectares: number;
  score: number;
  scoreTrend: number;
  monthlyRevenueChange: number;
  revenueHistory: { month: string; actual: number; projected: number }[];
  yieldHistory: { month: string; value: number }[];
  repayment: {
    ratio: number;
    liquidity: "Alta" | "Media" | "Baja";
    debtToAsset: number;
  };
  risk: {
    climate: "Bajo" | "Medio" | "Alto";
    market: "Bajo" | "Medio" | "Alto";
    logistics: "Bajo" | "Medio" | "Alto";
    climateScore: number;
    marketScore: number;
    logisticsScore: number;
  };
  zone: string;
  createdAt: string;
}

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function generateRevenue(base: number): FieldProfile["revenueHistory"] {
  return months.map((month, i) => ({
    month,
    actual: Math.round(base + Math.sin(i * 0.8) * base * 0.3 + Math.random() * base * 0.1),
    projected: Math.round(base + Math.sin(i * 0.8) * base * 0.25),
  }));
}

export const mockFields: FieldProfile[] = [
  {
    id: "1",
    name: "Estancia La Aurora",
    location: "Pergamino, Buenos Aires",
    hectares: 1200,
    score: 87,
    scoreTrend: 3,
    monthlyRevenueChange: 14.2,
    revenueHistory: generateRevenue(85000),
    yieldHistory: months.map((month, i) => ({ month, value: 4.2 + Math.sin(i * 0.5) * 1.2 })),
    repayment: { ratio: 1.8, liquidity: "Alta", debtToAsset: 0.22 },
    risk: { climate: "Bajo", market: "Medio", logistics: "Bajo", climateScore: 82, marketScore: 58, logisticsScore: 90 },
    zone: "Pampa Húmeda",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Campo El Trébol",
    location: "Venado Tuerto, Santa Fe",
    hectares: 800,
    score: 72,
    scoreTrend: -2,
    monthlyRevenueChange: -3.1,
    revenueHistory: generateRevenue(62000),
    yieldHistory: months.map((month, i) => ({ month, value: 3.8 + Math.cos(i * 0.6) * 0.9 })),
    repayment: { ratio: 1.3, liquidity: "Media", debtToAsset: 0.38 },
    risk: { climate: "Medio", market: "Alto", logistics: "Medio", climateScore: 55, marketScore: 35, logisticsScore: 62 },
    zone: "Pampa Húmeda",
    createdAt: "2024-03-22",
  },
  {
    id: "3",
    name: "Los Alamos Norte",
    location: "Río Cuarto, Córdoba",
    hectares: 2100,
    score: 91,
    scoreTrend: 5,
    monthlyRevenueChange: 22.8,
    revenueHistory: generateRevenue(120000),
    yieldHistory: months.map((month, i) => ({ month, value: 5.1 + Math.sin(i * 0.4) * 1.5 })),
    repayment: { ratio: 2.1, liquidity: "Alta", debtToAsset: 0.15 },
    risk: { climate: "Bajo", market: "Bajo", logistics: "Bajo", climateScore: 88, marketScore: 79, logisticsScore: 92 },
    zone: "Córdoba Central",
    createdAt: "2023-11-08",
  },
  {
    id: "4",
    name: "San Martín Sur",
    location: "Tucumán",
    hectares: 450,
    score: 54,
    scoreTrend: -8,
    monthlyRevenueChange: -12.5,
    revenueHistory: generateRevenue(35000),
    yieldHistory: months.map((month, i) => ({ month, value: 2.9 + Math.cos(i * 0.7) * 0.7 })),
    repayment: { ratio: 0.9, liquidity: "Baja", debtToAsset: 0.61 },
    risk: { climate: "Alto", market: "Alto", logistics: "Medio", climateScore: 28, marketScore: 22, logisticsScore: 55 },
    zone: "NOA",
    createdAt: "2024-06-01",
  },
  {
    id: "5",
    name: "Estancia Bella Vista",
    location: "Mercedes, Corrientes",
    hectares: 3200,
    score: 78,
    scoreTrend: 1,
    monthlyRevenueChange: 6.4,
    revenueHistory: generateRevenue(95000),
    yieldHistory: months.map((month, i) => ({ month, value: 3.5 + Math.sin(i * 0.3) * 1.0 })),
    repayment: { ratio: 1.5, liquidity: "Media", debtToAsset: 0.30 },
    risk: { climate: "Medio", market: "Bajo", logistics: "Alto", climateScore: 60, marketScore: 75, logisticsScore: 32 },
    zone: "NEA",
    createdAt: "2024-02-14",
  },
];
