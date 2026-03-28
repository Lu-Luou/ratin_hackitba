import { NextResponse } from "next/server";
import { Prisma, Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { buildFieldStats, serializeField } from "@/lib/fields/serialization";
import { requireSessionContext, SessionError } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ fieldId: string }>;
};

const updateFieldSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    hectares: z.number().int().positive().max(100_000).optional(),
    location: z.string().trim().min(2).max(160).optional(),
    zone: z.string().trim().min(2).max(120).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    bboxMinLon: z.number().min(-180).max(180).nullable().optional(),
    bboxMinLat: z.number().min(-90).max(90).nullable().optional(),
    bboxMaxLon: z.number().min(-180).max(180).nullable().optional(),
    bboxMaxLat: z.number().min(-90).max(90).nullable().optional(),
    defaultCostPerHaUsd: z.number().min(0).max(1_000_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;
    const body = updateFieldSchema.parse(await request.json());

    const currentField = await prisma.field.findFirst({
      where: fieldOwnershipWhere(appUser.id, fieldId, appUser.role),
      include: {
        predictionSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!currentField) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    const nextName = body.name ?? currentField.name;
    const nextHectares = body.hectares ?? currentField.hectares;
    const shouldRegenerateStats = nextName !== currentField.name || nextHectares !== currentField.hectares;
    const nextStats = shouldRegenerateStats ? buildFieldStats(nextName, nextHectares) : null;

    const updated = await prisma.field.update({
      where: {
        id: currentField.id,
      },
      data: {
        name: body.name,
        hectares: body.hectares,
        location: body.location,
        zone: body.zone,
        latitude: body.latitude,
        longitude: body.longitude,
        bboxMinLon: body.bboxMinLon,
        bboxMinLat: body.bboxMinLat,
        bboxMaxLon: body.bboxMaxLon,
        bboxMaxLat: body.bboxMaxLat,
        defaultCostPerHaUsd: body.defaultCostPerHaUsd,
        score: nextStats?.score,
        scoreTrend: nextStats?.scoreTrend,
        monthlyRevenueChange: nextStats?.monthlyRevenueChange,
        revenueHistory: nextStats ? (nextStats.revenueHistory as Prisma.InputJsonValue) : undefined,
        yieldHistory: nextStats ? (nextStats.yieldHistory as Prisma.InputJsonValue) : undefined,
        repayment: nextStats ? (nextStats.repayment as Prisma.InputJsonValue) : undefined,
        risk: nextStats ? (nextStats.risk as Prisma.InputJsonValue) : undefined,
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

    return NextResponse.json({
      data: serializeField(updated),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;

    const currentField = await prisma.field.findFirst({
      where: fieldOwnershipWhere(appUser.id, fieldId, appUser.role),
    });

    if (!currentField) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    await prisma.field.delete({
      where: {
        id: currentField.id,
      },
    });

    return NextResponse.json({
      message: "Campo eliminado.",
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
