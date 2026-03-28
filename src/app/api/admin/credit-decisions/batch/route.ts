import { NextResponse } from "next/server";
import { CreditRunStatus, Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, SessionError } from "@/lib/auth/session";
import { computeCreditDecision } from "@/lib/credit/engine";
import { fetchSoyPricing } from "@/lib/market/soyPricing";
import { fetchWeatherForField } from "@/lib/weather/provider";
import { prisma } from "@/lib/prisma";

const BATCH_ENGINE_VERSION = "credit-batch-v1";

const batchRunSchema = z.object({
  runKey: z.string().min(4).max(120).optional(),
  take: z.number().int().min(1).max(500).default(200),
  fieldIds: z.array(z.string().min(1)).max(500).optional(),
  dryRun: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireSessionContext([Role.ADMIN]);
    const payload = batchRunSchema.parse(await request.json().catch(() => ({})));
    const runKey = payload.runKey ?? `credit-batch-${utcDateKey()}`;

    const existingRun = await prisma.creditBatchRun.findUnique({
      where: { runKey },
      select: {
        id: true,
        status: true,
        processed: true,
        approved: true,
        rejected: true,
        skipped: true,
        failed: true,
        fieldsChecked: true,
        requestedAt: true,
        finishedAt: true,
      },
    });

    if (existingRun?.status === CreditRunStatus.COMPLETED) {
      return NextResponse.json({
        data: {
          runId: existingRun.id,
          runKey,
          status: existingRun.status,
          idempotent: true,
          summary: {
            fieldsChecked: existingRun.fieldsChecked,
            processed: existingRun.processed,
            approved: existingRun.approved,
            rejected: existingRun.rejected,
            skipped: existingRun.skipped,
            failed: existingRun.failed,
            requestedAt: existingRun.requestedAt.toISOString(),
            finishedAt: existingRun.finishedAt?.toISOString() ?? null,
          },
        },
      });
    }

    if (existingRun?.status === CreditRunStatus.RUNNING) {
      throw new SessionError(409, "A batch run with this runKey is already running.");
    }

    if (existingRun?.status === CreditRunStatus.FAILED) {
      throw new SessionError(409, "A failed run with this runKey already exists. Use a different runKey.");
    }

    const pricing = await fetchSoyPricing(3);

    const fields = await prisma.field.findMany({
      where: {
        ...(payload.fieldIds ? { id: { in: payload.fieldIds } } : {}),
        bboxMinLon: { not: null },
        bboxMinLat: { not: null },
        bboxMaxLon: { not: null },
        bboxMaxLat: { not: null },
      },
      select: {
        id: true,
        userId: true,
        hectares: true,
        latitude: true,
        longitude: true,
        bboxMinLat: true,
        bboxMinLon: true,
        bboxMaxLat: true,
        bboxMaxLon: true,
        defaultCostPerHaUsd: true,
        repayment: true,
        risk: true,
        yieldHistory: true,
        predictionSnapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            predictedYieldTonHa: true,
            netSpotUsd: true,
            createdAt: true,
          },
        },
        alertLinks: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            alert: {
              select: {
                relevanceScore: true,
                priorityScore: true,
                issuedAt: true,
              },
            },
          },
        },
      },
      take: payload.take,
      orderBy: { createdAt: "desc" },
    });

    if (fields.length === 0) {
      throw new SessionError(422, "No eligible fields found for credit batch processing.");
    }

    if (payload.dryRun) {
      const sample = [];

      for (const field of fields.slice(0, Math.min(20, fields.length))) {
        const weatherData = await fetchWeatherForField(
          field.latitude,
          field.longitude,
          field.bboxMinLat,
          field.bboxMinLon,
          field.bboxMaxLat,
          field.bboxMaxLon,
          30,
        );

        const computation = computeCreditDecision(field, {
          engineVersion: BATCH_ENGINE_VERSION,
          pricingSource: pricing.source,
          pricingFetchedAt: pricing.fetchedAt,
          weatherData: weatherData ?? undefined,
        });

        sample.push(computation);
      }

      const approved = sample.filter((item) => item.outcome === "APPROVED").length;
      const rejected = sample.length - approved;

      return NextResponse.json({
        data: {
          runKey,
          dryRun: true,
          engineVersion: BATCH_ENGINE_VERSION,
          pricingSource: pricing.source,
          pricingWarning: pricing.warning,
          sampled: sample.length,
          sampleApproved: approved,
          sampleRejected: rejected,
        },
      });
    }

    const run = await prisma.creditBatchRun.create({
      data: {
        runKey,
        engineVersion: BATCH_ENGINE_VERSION,
        requestedById: appUser.id,
        notes: payload.notes,
        metadata: {
          take: payload.take,
          requestedFieldIds: payload.fieldIds?.length ?? 0,
          pricingSource: pricing.source,
          pricingWarning: pricing.warning,
        },
      },
      select: {
        id: true,
      },
    });

    let approved = 0;
    let rejected = 0;
    let failed = 0;
    let processed = 0;
    const errors: Array<{ fieldId: string; error: string }> = [];

    for (const field of fields) {
      try {
        const weatherData = await fetchWeatherForField(
          field.latitude,
          field.longitude,
          field.bboxMinLat,
          field.bboxMinLon,
          field.bboxMaxLat,
          field.bboxMaxLon,
          30,
        );

        const computation = computeCreditDecision(field, {
          engineVersion: BATCH_ENGINE_VERSION,
          pricingSource: pricing.source,
          pricingFetchedAt: pricing.fetchedAt,
          weatherData: weatherData ?? undefined,
        });

        await prisma.creditDecision.create({
          data: {
            runId: run.id,
            fieldId: field.id,
            userId: field.userId,
            predictionSnapshotId: computation.predictionSnapshotId,
            decision: computation.outcome,
            score: computation.score,
            confidence: computation.confidence,
            decisionReason: computation.decisionReason,
            reasonCodes: computation.reasonCodes,
            featureSnapshot: computation.featureSnapshot,
            sourceSnapshot: computation.sourceSnapshot,
          },
        });

        processed += 1;

        if (computation.outcome === "APPROVED") {
          approved += 1;
        } else {
          rejected += 1;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Unknown decision error.";
        errors.push({ fieldId: field.id, error: message });
      }
    }

    await prisma.creditBatchRun.update({
      where: { id: run.id },
      data: {
        status: failed > 0 && processed === 0 ? CreditRunStatus.FAILED : CreditRunStatus.COMPLETED,
        fieldsChecked: fields.length,
        processed,
        approved,
        rejected,
        skipped: 0,
        failed,
        finishedAt: new Date(),
        metadata: {
          take: payload.take,
          requestedFieldIds: payload.fieldIds?.length ?? 0,
          pricingSource: pricing.source,
          pricingWarning: pricing.warning,
          errorCount: errors.length,
        },
      },
    });

    return NextResponse.json({
      data: {
        runId: run.id,
        runKey,
        engineVersion: BATCH_ENGINE_VERSION,
        pricingSource: pricing.source,
        pricingWarning: pricing.warning,
        fieldsChecked: fields.length,
        processed,
        approved,
        rejected,
        skipped: 0,
        failed,
      },
      errors,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
