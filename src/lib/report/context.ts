import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { predictYieldWithFeaturesFromBbox } from "@/lib/prediction/predictClient";
import { fetchWeatherForField, type WeatherData } from "@/lib/weather/provider";

type AppUserContext = {
  id: string;
  role: Role;
};

type BuildFieldReportContextInput = {
  appUser: AppUserContext;
  fieldId: string;
  origin: string;
  cookieHeader?: string;
  includeLiveFeatures?: boolean;
};

type CreditSummary = {
  decision: "APPROVED" | "REJECTED";
  score: number;
  confidence: number;
  decisionReason: string;
  reasonCodes: string[];
  createdAt: string;
};

type LivePredictionFeatures = {
  warning?: string;
  predictedYieldTonHa: number;
  ndvi: {
    avg: number | null;
    min: number | null;
    max: number | null;
  };
  temperatureBands: Array<{
    band: number;
    avg: number | null;
    max: number | null;
  }>;
  raw: Record<string, number>;
};

export type FieldReportContext = {
  generatedAt: string;
  field: {
    id: string;
    name: string;
    location: string;
    zone: string;
    hectares: number;
    owner: {
      id: string;
      name: string | null;
      farmName: string | null;
      email: string;
    };
  };
  geo: {
    latitude: number | null;
    longitude: number | null;
    bbox: {
      minLon: number | null;
      minLat: number | null;
      maxLon: number | null;
      maxLat: number | null;
    };
    center: {
      lat: number | null;
      lon: number | null;
    };
  };
  yield: {
    latestSnapshot: {
      snapshotId: string;
      startDate: string;
      endDate: string;
      predictedYieldTonHa: number;
      spotPriceUsdPerTon: number;
      costPerHaUsd: number;
      grossSpotUsd: number;
      netSpotUsd: number;
      warning: string | null;
      createdAt: string;
    } | null;
    historicalYieldSeries: Array<{ month: string; value: number }>;
  };
  weather: WeatherData | null;
  credit: CreditSummary | null;
  liveFeatures: LivePredictionFeatures | null;
  completeness: {
    hasLatestPrediction: boolean;
    hasWeatherMetrics: boolean;
    hasCreditDecision: boolean;
    hasLiveFeatures: boolean;
    score: number;
  };
  warnings: string[];
};

function fieldOwnershipWhere(appUserId: string, fieldId: string, role: Role) {
  if (role === Role.ADMIN) {
    return { id: fieldId };
  }

  return {
    id: fieldId,
    userId: appUserId,
  };
}

function toIsoDate(daysDelta: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysDelta);
  return date.toISOString().slice(0, 10);
}

function getCenter(
  latitude: number | null,
  longitude: number | null,
  bboxMinLat: number | null,
  bboxMinLon: number | null,
  bboxMaxLat: number | null,
  bboxMaxLon: number | null,
) {
  if (latitude !== null && longitude !== null) {
    return {
      lat: latitude,
      lon: longitude,
    };
  }

  if (bboxMinLat !== null && bboxMinLon !== null && bboxMaxLat !== null && bboxMaxLon !== null) {
    return {
      lat: Number(((bboxMinLat + bboxMaxLat) / 2).toFixed(6)),
      lon: Number(((bboxMinLon + bboxMaxLon) / 2).toFixed(6)),
    };
  }

  return {
    lat: null,
    lon: null,
  };
}

function toCreditSummary(raw: {
  decision: "APPROVED" | "REJECTED";
  score: number;
  confidence: number;
  decisionReason: string;
  reasonCodes: string[];
  createdAt: Date;
}): CreditSummary {
  return {
    decision: raw.decision,
    score: Number(raw.score.toFixed(2)),
    confidence: Number(raw.confidence.toFixed(2)),
    decisionReason: raw.decisionReason,
    reasonCodes: raw.reasonCodes,
    createdAt: raw.createdAt.toISOString(),
  };
}

function parseHistoricalYieldSeries(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as Array<{ month: string; value: number }>;
  }

  return raw
    .filter((item): item is { month: string; value: number } => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const month = (item as { month?: unknown }).month;
      const value = (item as { value?: unknown }).value;

      return typeof month === "string" && typeof value === "number" && Number.isFinite(value);
    })
    .map((item) => ({
      month: item.month,
      value: Number(item.value.toFixed(2)),
    }));
}

function toLiveFeatureSummary(features: Record<string, number>, warning: string | undefined, predictedYieldTonHa: number): LivePredictionFeatures {
  const temperatureBands = Array.from({ length: 9 }, (_, band) => ({
    band,
    avg: typeof features[`temp_band_${band}_avg`] === "number" ? Number(features[`temp_band_${band}_avg`].toFixed(4)) : null,
    max: typeof features[`temp_band_${band}_max`] === "number" ? Number(features[`temp_band_${band}_max`].toFixed(4)) : null,
  }));

  return {
    warning,
    predictedYieldTonHa,
    ndvi: {
      avg: typeof features.ndvi_avg === "number" ? Number(features.ndvi_avg.toFixed(4)) : null,
      min: typeof features.ndvi_min === "number" ? Number(features.ndvi_min.toFixed(4)) : null,
      max: typeof features.ndvi_max === "number" ? Number(features.ndvi_max.toFixed(4)) : null,
    },
    temperatureBands,
    raw: features,
  };
}

export async function buildFieldReportContext(input: BuildFieldReportContextInput): Promise<FieldReportContext | null> {
  const field = await prisma.field.findFirst({
    where: fieldOwnershipWhere(input.appUser.id, input.fieldId, input.appUser.role),
    select: {
      id: true,
      name: true,
      location: true,
      zone: true,
      hectares: true,
      latitude: true,
      longitude: true,
      bboxMinLon: true,
      bboxMinLat: true,
      bboxMaxLon: true,
      bboxMaxLat: true,
      yieldHistory: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          farmName: true,
        },
      },
      predictionSnapshots: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          predictedYieldTonHa: true,
          spotPriceUsdPerTon: true,
          costPerHaUsd: true,
          grossSpotUsd: true,
          netSpotUsd: true,
          warning: true,
          createdAt: true,
        },
      },
      creditDecisions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          decision: true,
          score: true,
          confidence: true,
          decisionReason: true,
          reasonCodes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!field) {
    return null;
  }

  const latestSnapshot = field.predictionSnapshots[0] ?? null;
  const latestCredit = field.creditDecisions[0] ?? null;
  const center = getCenter(
    field.latitude,
    field.longitude,
    field.bboxMinLat,
    field.bboxMinLon,
    field.bboxMaxLat,
    field.bboxMaxLon,
  );

  const weather = await fetchWeatherForField(
    field.latitude,
    field.longitude,
    field.bboxMinLat,
    field.bboxMinLon,
    field.bboxMaxLat,
    field.bboxMaxLon,
    30,
  );

  let liveFeatures: LivePredictionFeatures | null = null;
  const warnings: string[] = [];

  if (weather?.warning) {
    warnings.push(weather.warning);
  }

  const hasBbox =
    field.bboxMinLon !== null &&
    field.bboxMinLat !== null &&
    field.bboxMaxLon !== null &&
    field.bboxMaxLat !== null;

  if (input.includeLiveFeatures !== false && hasBbox) {
    try {
      const predictionRangeStart = latestSnapshot?.startDate ?? toIsoDate(-120);
      const predictionRangeEnd = latestSnapshot?.endDate ?? toIsoDate(0);
      const live = await predictYieldWithFeaturesFromBbox({
        origin: input.origin,
        bbox: [field.bboxMinLon as number, field.bboxMinLat as number, field.bboxMaxLon as number, field.bboxMaxLat as number],
        startDate: predictionRangeStart,
        endDate: predictionRangeEnd,
        cookieHeader: input.cookieHeader,
      });

      liveFeatures = toLiveFeatureSummary(live.features, live.warning, live.predictedYieldTonHa);

      if (live.warning) {
        warnings.push(live.warning);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron obtener features satelitales en vivo.";
      warnings.push(`Live feature fetch failed: ${message}`);
    }
  }

  const completenessSignals = {
    hasLatestPrediction: latestSnapshot !== null,
    hasWeatherMetrics: weather !== null,
    hasCreditDecision: latestCredit !== null,
    hasLiveFeatures: liveFeatures !== null,
  };

  const completenessScore = Number(
    (
      Object.values(completenessSignals).filter((flag) => flag).length /
      Object.keys(completenessSignals).length
    ).toFixed(2),
  );

  return {
    generatedAt: new Date().toISOString(),
    field: {
      id: field.id,
      name: field.name,
      location: field.location,
      zone: field.zone,
      hectares: field.hectares,
      owner: {
        id: field.user.id,
        name: field.user.name,
        farmName: field.user.farmName,
        email: field.user.email,
      },
    },
    geo: {
      latitude: field.latitude,
      longitude: field.longitude,
      bbox: {
        minLon: field.bboxMinLon,
        minLat: field.bboxMinLat,
        maxLon: field.bboxMaxLon,
        maxLat: field.bboxMaxLat,
      },
      center,
    },
    yield: {
      latestSnapshot: latestSnapshot
        ? {
            snapshotId: latestSnapshot.id,
            startDate: latestSnapshot.startDate,
            endDate: latestSnapshot.endDate,
            predictedYieldTonHa: Number(latestSnapshot.predictedYieldTonHa.toFixed(3)),
            spotPriceUsdPerTon: Number(latestSnapshot.spotPriceUsdPerTon.toFixed(2)),
            costPerHaUsd: Number(latestSnapshot.costPerHaUsd.toFixed(2)),
            grossSpotUsd: Number(latestSnapshot.grossSpotUsd.toFixed(2)),
            netSpotUsd: Number(latestSnapshot.netSpotUsd.toFixed(2)),
            warning: latestSnapshot.warning,
            createdAt: latestSnapshot.createdAt.toISOString(),
          }
        : null,
      historicalYieldSeries: parseHistoricalYieldSeries(field.yieldHistory),
    },
    weather,
    credit: latestCredit ? toCreditSummary(latestCredit) : null,
    liveFeatures,
    completeness: {
      ...completenessSignals,
      score: completenessScore,
    },
    warnings,
  };
}
