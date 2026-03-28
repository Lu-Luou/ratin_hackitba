import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { buildFieldStats, serializeField } from "@/lib/fields/serialization";
import { prisma } from "@/lib/prisma";


const createFieldSchema = z.object({
  name: z.string().trim().min(2).max(160),
  hectares: z.number().int().positive().max(100_000),
  location: z.string().trim().min(2).max(160).optional(),
  zone: z.string().trim().min(2).max(120).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  bboxMinLon: z.number().min(-180).max(180).nullable().optional(),
  bboxMinLat: z.number().min(-90).max(90).nullable().optional(),
  bboxMaxLon: z.number().min(-180).max(180).nullable().optional(),
  bboxMaxLat: z.number().min(-90).max(90).nullable().optional(),
  defaultCostPerHaUsd: z.number().min(0).max(1_000_000).optional(),
});

export async function GET() {
  try {
    const { appUser } = await requireSessionContext();

    const fields = await prisma.field.findMany({
      where: {
        userId: appUser.id,
      },
      include: {
        predictionSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({
      data: fields.map((field) => serializeField(field)),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireSessionContext();
    const body = createFieldSchema.parse(await request.json());
    const stats = buildFieldStats(body.name, body.hectares);

    const field = await prisma.field.create({
      data: {
        userId: appUser.id,
        name: body.name,
        hectares: body.hectares,
        location: body.location ?? "Sin definir",
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        bboxMinLon: body.bboxMinLon ?? null,
        bboxMinLat: body.bboxMinLat ?? null,
        bboxMaxLon: body.bboxMaxLon ?? null,
        bboxMaxLat: body.bboxMaxLat ?? null,
        zone: body.zone ?? "Sin definir",
        defaultCostPerHaUsd: body.defaultCostPerHaUsd ?? 0,
        score: stats.score,
        scoreTrend: stats.scoreTrend,
        monthlyRevenueChange: stats.monthlyRevenueChange,
        revenueHistory: stats.revenueHistory as Prisma.InputJsonValue,
        yieldHistory: stats.yieldHistory as Prisma.InputJsonValue,
        repayment: stats.repayment as Prisma.InputJsonValue,
        risk: stats.risk as Prisma.InputJsonValue,
      },
      include: {
        predictionSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(
      {
        data: serializeField(field),
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}
