import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { buildMockWeatherAlerts } from "@/lib/alerts/mock";
import { prisma } from "@/lib/prisma";
import type { AlertSource, WeatherAlertItem } from "@/types/alert";

const createAlertSchema = z.object({
  relevanceScore: z.number().int().min(0).max(100),
  priorityScore: z.number().int().min(0).max(100).optional(),
  location: z.string().trim().min(2).max(200),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  description: z.string().trim().min(8).max(400),
  extractedVariables: z.record(z.string(), z.unknown()),
  affectedFieldIds: z.array(z.string().trim().min(1)).max(25).optional(),
  issuedAt: z.string().datetime().optional(),
});

type PersistedAlertRow = {
  id: string;
  relevanceScore: number;
  priorityScore: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  extractedVariables: unknown;
  issuedAt: Date;
  affectedFields?: Array<{
    field: {
      id: string;
      name: string;
    };
  }>;
};

type WeatherAlertDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
};

function getWeatherAlertDelegate() {
  const candidate = prisma as unknown as {
    weatherAlert?: WeatherAlertDelegate;
  };

  return candidate.weatherAlert ?? null;
}

function toVariables(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function serializePersistedAlert(alert: PersistedAlertRow): WeatherAlertItem {
  return {
    id: alert.id,
    relevanceScore: alert.relevanceScore,
    priorityScore: alert.priorityScore,
    location: alert.location,
    latitude: alert.latitude,
    longitude: alert.longitude,
    description: alert.description,
    extractedVariables: toVariables(alert.extractedVariables),
    affectedFields: (alert.affectedFields ?? []).map((item) => ({
      id: item.field.id,
      name: item.field.name,
    })),
    issuedAt: alert.issuedAt.toISOString(),
  };
}

async function resolveAlerts(userId: string, includeMocks: boolean): Promise<{ data: WeatherAlertItem[]; source: AlertSource }> {
  const weatherAlertDelegate = getWeatherAlertDelegate();

  if (weatherAlertDelegate) {
    const persisted = (await weatherAlertDelegate.findMany({
      where: {
        userId,
      },
      include: {
        affectedFields: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
      take: 25,
    })) as PersistedAlertRow[];

    if (persisted.length > 0) {
      return {
        data: persisted.map((item) => serializePersistedAlert(item)),
        source: "database",
      };
    }
  }

  if (!includeMocks) {
    return {
      data: [],
      source: "database",
    };
  }

  const fields = await prisma.field.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
      location: true,
      zone: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  // Only generate mock alerts if user has fields
  if (fields.length === 0) {
    return {
      data: [],
      source: "mock",
    };
  }

  return {
    data: buildMockWeatherAlerts(fields),
    source: "mock",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireSessionContext();
    const includeMocks = request.nextUrl.searchParams.get("mock") !== "0";
    const resolved = await resolveAlerts(appUser.id, includeMocks);

    return NextResponse.json({
      data: resolved.data,
      meta: {
        source: resolved.source,
        totalAlerts: resolved.data.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireSessionContext();
    const body = createAlertSchema.parse(await request.json());
    const weatherAlertDelegate = getWeatherAlertDelegate();

    if (!weatherAlertDelegate) {
      return NextResponse.json(
        {
          error: "El modelo de alertas no esta disponible todavia. Ejecuta las migraciones y prisma generate.",
        },
        { status: 503 },
      );
    }

    const affectedFieldIds = Array.from(new Set(body.affectedFieldIds ?? []));

    if (affectedFieldIds.length > 0) {
      const ownedFields = await prisma.field.findMany({
        where: {
          userId: appUser.id,
          id: {
            in: affectedFieldIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (ownedFields.length !== affectedFieldIds.length) {
        return NextResponse.json(
          {
            error: "Una o mas etiquetas de campo no pertenecen al usuario autenticado.",
          },
          { status: 403 },
        );
      }
    }

    const created = (await weatherAlertDelegate.create({
      data: {
        userId: appUser.id,
        relevanceScore: body.relevanceScore,
        priorityScore: body.priorityScore ?? 0,
        location: body.location,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        description: body.description,
        extractedVariables: body.extractedVariables,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        affectedFields:
          affectedFieldIds.length > 0
            ? {
                createMany: {
                  data: affectedFieldIds.map((fieldId) => ({
                    fieldId,
                  })),
                },
              }
            : undefined,
      },
      include: {
        affectedFields: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })) as PersistedAlertRow;

    return NextResponse.json(
      {
        data: serializePersistedAlert(created),
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}
