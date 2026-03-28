import { NextResponse } from "next/server";
import { CreditDecisionOutcome, Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const decisionFilterSchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  runKey: z.string().min(1).optional(),
  userId: z.string().uuid().optional(),
  outcome: z.nativeEnum(CreditDecisionOutcome).optional(),
});

export async function GET(request: Request) {
  try {
    await requireSessionContext([Role.ADMIN]);

    const url = new URL(request.url);
    const filters = decisionFilterSchema.parse({
      take: url.searchParams.get("take") ?? undefined,
      runKey: url.searchParams.get("runKey") ?? undefined,
      userId: url.searchParams.get("userId") ?? undefined,
      outcome: url.searchParams.get("outcome") ?? undefined,
    });

    const run = filters.runKey
      ? await prisma.creditBatchRun.findUnique({
          where: { runKey: filters.runKey },
          select: { id: true },
        })
      : null;

    if (filters.runKey && !run) {
      return NextResponse.json({ data: [] });
    }

    const decisions = await prisma.creditDecision.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.outcome ? { decision: filters.outcome } : {}),
        ...(run?.id ? { runId: run.id } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filters.take,
      select: {
        id: true,
        runId: true,
        fieldId: true,
        userId: true,
        decision: true,
        score: true,
        confidence: true,
        decisionReason: true,
        reasonCodes: true,
        createdAt: true,
        run: {
          select: {
            runKey: true,
            engineVersion: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: decisions.map((decision) => ({
        id: decision.id,
        runId: decision.runId,
        runKey: decision.run.runKey,
        engineVersion: decision.run.engineVersion,
        runStatus: decision.run.status,
        fieldId: decision.fieldId,
        userId: decision.userId,
        outcome: decision.decision,
        score: Number(decision.score.toFixed(2)),
        confidence: Number(decision.confidence.toFixed(2)),
        reason: decision.decisionReason,
        reasonCodes: decision.reasonCodes,
        createdAt: decision.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
