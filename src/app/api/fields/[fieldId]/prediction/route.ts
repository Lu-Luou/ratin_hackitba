import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, SessionError } from "@/lib/auth/session";
import { fetchSoyPricing } from "@/lib/market/soyPricing";
import { calculateValuation, predictYieldFromBbox } from "@/lib/prediction/predictClient";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ fieldId: string }>;
};

const predictionRunSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  costPerHaUsd: z.number().min(0).max(1_000_000).optional(),
  bboxMinLon: z.number().min(-180).max(180).optional(),
  bboxMinLat: z.number().min(-90).max(90).optional(),
  bboxMaxLon: z.number().min(-180).max(180).optional(),
  bboxMaxLat: z.number().min(-90).max(90).optional(),
});

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

function extractAuthTokenCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";");
  const authCookie = cookies
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.includes("auth-token="));

  return authCookie && authCookie.length > 0 ? authCookie : undefined;
}

function serializePredictionSnapshot(snapshot: {
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
}) {
  const futuresContracts = z
    .array(
      z.object({
        symbol: z.string(),
        label: z.string(),
        expiration: z.string(),
        priceUsdPerTon: z.number(),
      }),
    )
    .parse(snapshot.futuresContracts);
  const grossBySymbol = z.record(z.string(), z.number()).parse(snapshot.grossFuturesUsd);
  const netBySymbol = z.record(z.string(), z.number()).parse(snapshot.netFuturesUsd);

  return {
    snapshotId: snapshot.id,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    predictedYieldTonHa: Number(snapshot.predictedYieldTonHa.toFixed(3)),
    warning: snapshot.warning ?? undefined,
    spotPriceUsdPerTon: Number(snapshot.spotPriceUsdPerTon.toFixed(2)),
    costPerHaUsd: Number(snapshot.costPerHaUsd.toFixed(2)),
    grossSpotUsd: Number(snapshot.grossSpotUsd.toFixed(2)),
    netSpotUsd: Number(snapshot.netSpotUsd.toFixed(2)),
    futuresContracts,
    futuresValuations: futuresContracts.map((contract) => ({
      symbol: contract.symbol,
      label: contract.label,
      expiration: contract.expiration,
      priceUsdPerTon: Number(contract.priceUsdPerTon.toFixed(2)),
      grossUsd: Number((grossBySymbol[contract.symbol] ?? 0).toFixed(2)),
      netUsd: Number((netBySymbol[contract.symbol] ?? 0).toFixed(2)),
    })),
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;

    const field = await prisma.field.findFirst({
      where: fieldOwnershipWhere(appUser.id, fieldId, appUser.role),
      select: {
        id: true,
        predictionSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!field) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    const latest = field.predictionSnapshots[0];

    return NextResponse.json({
      data: latest ? serializePredictionSnapshot(latest) : null,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;
    const payload = predictionRunSchema.parse(await request.json().catch(() => ({})));

    console.log(`[PREDICTION] Starting prediction for field ${fieldId}`, {
      payloadBbox: {
        bboxMinLon: payload.bboxMinLon,
        bboxMinLat: payload.bboxMinLat,
        bboxMaxLon: payload.bboxMaxLon,
        bboxMaxLat: payload.bboxMaxLat,
      },
    });

    const field = await prisma.field.findFirst({
      where: fieldOwnershipWhere(appUser.id, fieldId, appUser.role),
      select: {
        id: true,
        hectares: true,
        defaultCostPerHaUsd: true,
        bboxMinLon: true,
        bboxMinLat: true,
        bboxMaxLon: true,
        bboxMaxLat: true,
      },
    });

    if (!field) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    const { bboxMinLon, bboxMinLat, bboxMaxLon, bboxMaxLat } = field;

    console.log(`[PREDICTION] Field bbox from db:`, {
      bboxMinLon,
      bboxMinLat,
      bboxMaxLon,
      bboxMaxLat,
    });

    // Use bbox from field if available, otherwise use bbox from request
    const finalBboxMinLon = bboxMinLon ?? payload.bboxMinLon;
    const finalBboxMinLat = bboxMinLat ?? payload.bboxMinLat;
    const finalBboxMaxLon = bboxMaxLon ?? payload.bboxMaxLon;
    const finalBboxMaxLat = bboxMaxLat ?? payload.bboxMaxLat;

    console.log(`[PREDICTION] Final bbox to use:`, {
      finalBboxMinLon,
      finalBboxMinLat,
      finalBboxMaxLon,
      finalBboxMaxLat,
    });

    if ([finalBboxMinLon, finalBboxMinLat, finalBboxMaxLon, finalBboxMaxLat].some((value) => value === null || value === undefined)) {
      console.error(`[PREDICTION] Missing bbox values:`, {
        finalBboxMinLon,
        finalBboxMinLat,
        finalBboxMaxLon,
        finalBboxMaxLat,
      });
      throw new SessionError(422, "El campo no tiene un bbox valido para la prediccion. Proporciona las coordenadas en la solicitud o actualiza el campo.");
    }

    const startDate = payload.startDate ?? toIsoDate(-120);
    const endDate = payload.endDate ?? toIsoDate(0);
    const costPerHaUsd = payload.costPerHaUsd ?? field.defaultCostPerHaUsd;
    const requestOrigin = new URL(request.url).origin;

    console.log(`[PREDICTION] Starting prediction with params:`, {
      startDate,
      endDate,
      costPerHaUsd,
      hectares: field.hectares,
    });

    const authCookieHeader = extractAuthTokenCookie(request.headers.get("cookie"));

    const prediction = await predictYieldFromBbox({
      origin: requestOrigin,
      bbox: [finalBboxMinLon as number, finalBboxMinLat as number, finalBboxMaxLon as number, finalBboxMaxLat as number],
      startDate,
      endDate,
      cookieHeader: authCookieHeader,
    });

    console.log(`[PREDICTION] Got prediction result:`, {
      predictedYieldTonHa: prediction.predictedYieldTonHa,
      warning: prediction.warning,
    });

    const pricing = await fetchSoyPricing(3);

    console.log(`[PREDICTION] Got pricing:`, {
      spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
      futuresCount: pricing.futures.length,
    });

    const valuation = calculateValuation({
      hectares: field.hectares,
      predictedYieldTonHa: prediction.predictedYieldTonHa,
      spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
      futuresContracts: pricing.futures,
      costPerHaUsd,
    });

    console.log(`[PREDICTION] Calculated valuation:`, {
      grossSpotUsd: valuation.grossSpotUsd,
      netSpotUsd: valuation.netSpotUsd,
    });

    const snapshot = await prisma.predictionSnapshot.create({
      data: {
        fieldId: field.id,
        startDate,
        endDate,
        predictedYieldTonHa: prediction.predictedYieldTonHa,
        warning: prediction.warning,
        spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
        futuresContracts: pricing.futures,
        costPerHaUsd,
        grossSpotUsd: valuation.grossSpotUsd,
        netSpotUsd: valuation.netSpotUsd,
        grossFuturesUsd: valuation.grossFuturesUsd,
        netFuturesUsd: valuation.netFuturesUsd,
      },
    });

    console.log(`[PREDICTION] Successfully created snapshot ${snapshot.id}`);

    return NextResponse.json({
      data: serializePredictionSnapshot(snapshot),
    });
  } catch (error) {
    console.error(`[PREDICTION] Error:`, error);
    return mapRouteError(error);
  }
}
