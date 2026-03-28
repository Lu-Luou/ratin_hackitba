import { NextResponse } from "next/server";
import { fetchSoyPricing } from "@/lib/market/soyPricing";
import { calculateValuation, predictYieldFromBbox } from "@/lib/prediction/predictClient";
import { prisma } from "@/lib/prisma";

function toIsoDate(daysDelta: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysDelta);
  return date.toISOString().slice(0, 10);
}

function isSameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const received = request.headers.get("x-cron-secret");
    const authHeader = request.headers.get("authorization");
    const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!secret || (received !== secret && authToken !== secret)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const requestOrigin = new URL(request.url).origin;
    const startDate = toIsoDate(-120);
    const endDate = toIsoDate(0);
    const now = new Date();

    const pricing = await fetchSoyPricing(3);
    const fields = await prisma.field.findMany({
      where: {
        bboxMinLon: { not: null },
        bboxMinLat: { not: null },
        bboxMaxLon: { not: null },
        bboxMaxLat: { not: null },
      },
      select: {
        id: true,
        hectares: true,
        defaultCostPerHaUsd: true,
        bboxMinLon: true,
        bboxMinLat: true,
        bboxMaxLon: true,
        bboxMaxLat: true,
        predictionSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
      take: 1000,
    });

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ fieldId: string; error: string }> = [];

    for (const field of fields) {
      const latest = field.predictionSnapshots[0];
      if (latest && isSameUtcDay(latest.createdAt, now)) {
        skipped += 1;
        continue;
      }

      try {
        const prediction = await predictYieldFromBbox({
          origin: requestOrigin,
          bbox: [field.bboxMinLon as number, field.bboxMinLat as number, field.bboxMaxLon as number, field.bboxMaxLat as number],
          startDate,
          endDate,
        });
        const valuation = calculateValuation({
          hectares: field.hectares,
          predictedYieldTonHa: prediction.predictedYieldTonHa,
          spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
          futuresContracts: pricing.futures,
          costPerHaUsd: field.defaultCostPerHaUsd,
        });

        await prisma.predictionSnapshot.create({
          data: {
            fieldId: field.id,
            startDate,
            endDate,
            predictedYieldTonHa: prediction.predictedYieldTonHa,
            warning: prediction.warning,
            spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
            futuresContracts: pricing.futures,
            costPerHaUsd: field.defaultCostPerHaUsd,
            grossSpotUsd: valuation.grossSpotUsd,
            netSpotUsd: valuation.netSpotUsd,
            grossFuturesUsd: valuation.grossFuturesUsd,
            netFuturesUsd: valuation.netFuturesUsd,
          },
        });

        processed += 1;
      } catch (error) {
        failed += 1;
        errors.push({
          fieldId: field.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      data: {
        processed,
        skipped,
        failed,
        fieldsChecked: fields.length,
        pricingFetchedAt: pricing.fetchedAt,
      },
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
