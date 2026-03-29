import type { WeatherAlertItem } from "@/types/alert";
import type { FieldProfile, FieldRisk, RiskLevel } from "@/types/field";

type RiskBucket = "climate" | "market" | "logistics";

type RegionField = Pick<
  FieldProfile,
  "id" | "name" | "location" | "zone" | "latitude" | "longitude" | "bboxMinLat" | "bboxMinLon" | "bboxMaxLat" | "bboxMaxLon"
>;

type RiskDeductions = Record<RiskBucket, number>;

type BucketStats = {
  count: number;
  sum: number;
  max: number;
};

export type FieldAlertRiskAdjustment = {
  matchedAlertsCount: number;
  matchedAlertIds: string[];
  deductions: RiskDeductions;
};

const ZERO_DEDUCTIONS: RiskDeductions = {
  climate: 0,
  market: 0,
  logistics: 0,
};

const DEDUCTION_CAPS: RiskDeductions = {
  climate: 45,
  market: 26,
  logistics: 34,
};

const RISK_WEIGHTS: RiskDeductions = {
  climate: 1,
  market: 0.58,
  logistics: 0.74,
};

const TEXT_STOPWORDS = new Set([
  "sin",
  "definir",
  "zona",
  "region",
  "regional",
  "campo",
  "campos",
  "cobertura",
]);

const CLIMATE_KEYWORDS = [
  "clima",
  "meteoro",
  "torment",
  "lluv",
  "precipit",
  "granizo",
  "sequia",
  "helad",
  "inund",
  "aneg",
  "temperat",
  "viento",
  "frente",
  "humedad",
  "hail",
  "storm",
  "rain",
  "wind",
  "weather",
];

const LOGISTICS_KEYWORDS = [
  "logist",
  "transporte",
  "camino",
  "ruta",
  "acceso",
  "aneg",
  "inund",
  "corte",
  "demora",
  "puerto",
  "vial",
  "trafico",
  "flete",
];

const MARKET_KEYWORDS = [
  "mercad",
  "precio",
  "demanda",
  "oferta",
  "volatil",
  "insumo",
  "export",
  "import",
  "dolar",
  "futuro",
  "spot",
  "cost",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeIdentity(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function tokenize(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => normalizeText(value).split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 3 && !TEXT_STOPWORDS.has(token));
}

function sharesRegionToken(alertText: string, field: RegionField) {
  const fieldTokens = new Set(tokenize([field.location, field.zone, field.name]));

  if (fieldTokens.size === 0) {
    return false;
  }

  const alertTokens = tokenize([alertText]);

  for (const token of alertTokens) {
    if (fieldTokens.has(token)) {
      return true;
    }
  }

  return false;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(latA: number, lonA: number, latB: number, lonB: number) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const haversine =
    sinLat * sinLat +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * sinLon * sinLon;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function isPointInsideBbox(field: RegionField, latitude: number, longitude: number) {
  const { bboxMinLat, bboxMinLon, bboxMaxLat, bboxMaxLon } = field;

  if (
    bboxMinLat === null ||
    bboxMinLon === null ||
    bboxMaxLat === null ||
    bboxMaxLon === null
  ) {
    return false;
  }

  const minLat = Math.min(bboxMinLat, bboxMaxLat);
  const maxLat = Math.max(bboxMinLat, bboxMaxLat);
  const minLon = Math.min(bboxMinLon, bboxMaxLon);
  const maxLon = Math.max(bboxMinLon, bboxMaxLon);

  return latitude >= minLat && latitude <= maxLat && longitude >= minLon && longitude <= maxLon;
}

function getAlertText(alert: WeatherAlertItem) {
  const variableText = Object.entries(alert.extractedVariables)
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(" ");

  return normalizeText(`${alert.description} ${alert.location} ${variableText}`);
}

function resolveAlertMatchWeight(alert: WeatherAlertItem, field: RegionField) {
  const normalizedFieldId = normalizeIdentity(field.id);
  const normalizedFieldName = normalizeIdentity(field.name);
  const directlyTagged = alert.affectedFields.some((tag) => {
    const normalizedTagId = normalizeIdentity(tag.id);
    const normalizedTagName = normalizeIdentity(tag.name);

    return normalizedTagId === normalizedFieldId || normalizedTagName === normalizedFieldName;
  });

  if (directlyTagged) {
    return 1;
  }

  // If tags are present, treat them as authoritative to avoid cross-field false matches.
  if (alert.affectedFields.length > 0) {
    return 0;
  }

  const alertText = getAlertText(alert);
  const zoneFromVariables = alert.extractedVariables.zone;
  const zoneText = typeof zoneFromVariables === "string" ? normalizeText(zoneFromVariables) : "";
  const fieldZone = normalizeText(field.zone);

  if ((zoneText.length > 0 && zoneText === fieldZone) || sharesRegionToken(alertText, field)) {
    return 0.74;
  }

  if (alert.latitude !== null && alert.longitude !== null) {
    if (isPointInsideBbox(field, alert.latitude, alert.longitude)) {
      return 0.66;
    }

    if (field.latitude !== null && field.longitude !== null) {
      const kilometers = distanceKm(field.latitude, field.longitude, alert.latitude, alert.longitude);

      if (kilometers <= 60) {
        return 0.58;
      }
    }
  }

  return 0;
}

function toPriorityRatio(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  const normalized = score <= 10 ? score / 10 : score / 100;
  return clamp(normalized, 0, 1);
}

function toRelevanceRatio(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return clamp(score / 100, 0, 1);
}

function toAlertSeverity(alert: WeatherAlertItem) {
  const priority = toPriorityRatio(alert.priorityScore);
  const relevance = toRelevanceRatio(alert.relevanceScore);

  // Priority drives urgency; relevance refines confidence/context.
  return clamp(priority * 0.72 + relevance * 0.28, 0, 1);
}

function resolveAffectedBuckets(alert: WeatherAlertItem): RiskBucket[] {
  const text = getAlertText(alert);
  const matchesClimate = CLIMATE_KEYWORDS.some((keyword) => text.includes(keyword));
  const matchesLogistics = LOGISTICS_KEYWORDS.some((keyword) => text.includes(keyword));
  const matchesMarket = MARKET_KEYWORDS.some((keyword) => text.includes(keyword));

  const buckets: RiskBucket[] = [];

  if (matchesClimate) {
    buckets.push("climate");
  }

  if (matchesLogistics) {
    buckets.push("logistics");
  }

  if (matchesMarket) {
    buckets.push("market");
  }

  if (buckets.length === 0) {
    buckets.push("climate");
  }

  return buckets;
}

function toBucketDeduction(stats: BucketStats, cap: number) {
  if (stats.count === 0) {
    return 0;
  }

  const volumeBoost = Math.max(0, Math.log2(1 + stats.count) - 1) * 2.4;
  const peakBonus = stats.max > 0.72 ? (stats.max - 0.72) * 6.5 : 0;

  let deduction = stats.sum * 4.2 + stats.max * 3.4 + volumeBoost + peakBonus;

  // A single mild signal should not over-penalize the field.
  if (stats.count === 1 && stats.max < 0.4) {
    deduction *= 0.72;
  }

  return Number(clamp(deduction, 0, cap).toFixed(1));
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

function clampScore(score: number) {
  return Number(clamp(score, 0, 100).toFixed(1));
}

export function computeFieldAlertRiskAdjustment(field: RegionField, alerts: WeatherAlertItem[]): FieldAlertRiskAdjustment {
  if (alerts.length === 0) {
    return {
      matchedAlertsCount: 0,
      matchedAlertIds: [],
      deductions: ZERO_DEDUCTIONS,
    };
  }

  const running: Record<RiskBucket, BucketStats> = {
    climate: {
      count: 0,
      sum: 0,
      max: 0,
    },
    market: {
      count: 0,
      sum: 0,
      max: 0,
    },
    logistics: {
      count: 0,
      sum: 0,
      max: 0,
    },
  };
  const matchedAlertIds: string[] = [];

  for (const alert of alerts) {
    const matchWeight = resolveAlertMatchWeight(alert, field);

    if (matchWeight <= 0) {
      continue;
    }

    matchedAlertIds.push(alert.id);

    const severity = toAlertSeverity(alert);
    const buckets = resolveAffectedBuckets(alert);

    for (const bucket of buckets) {
      const contribution = severity * matchWeight * RISK_WEIGHTS[bucket];
      running[bucket].count += 1;
      running[bucket].sum += contribution;
      running[bucket].max = Math.max(running[bucket].max, contribution);
    }
  }

  const deductions: RiskDeductions = {
    climate: toBucketDeduction(running.climate, DEDUCTION_CAPS.climate),
    market: toBucketDeduction(running.market, DEDUCTION_CAPS.market),
    logistics: toBucketDeduction(running.logistics, DEDUCTION_CAPS.logistics),
  };

  return {
    matchedAlertsCount: matchedAlertIds.length,
    matchedAlertIds,
    deductions,
  };
}

export function applyAlertRiskAdjustment(risk: FieldRisk, adjustment: FieldAlertRiskAdjustment): FieldRisk {
  const defaultMaxScore = 100;

  const climateScore = clampScore(defaultMaxScore - adjustment.deductions.climate);
  const marketScore = clampScore(defaultMaxScore - adjustment.deductions.market);
  const logisticsScore = clampScore(defaultMaxScore - adjustment.deductions.logistics);

  return {
    climateScore,
    marketScore,
    logisticsScore,
    climate: toRiskLevel(climateScore),
    market: toRiskLevel(marketScore),
    logistics: toRiskLevel(logisticsScore),
  };
}