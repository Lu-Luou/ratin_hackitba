import { NextResponse } from "next/server";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { fetchWeatherForField } from "@/lib/weather/provider";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ fieldId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireSessionContext();
    const { fieldId } = await context.params;

    const field = await prisma.field.findFirst({
      where: { id: fieldId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        bboxMinLat: true,
        bboxMinLon: true,
        bboxMaxLat: true,
        bboxMaxLon: true,
        userId: true,
      },
    });

    if (!field) {
      return NextResponse.json({ data: null }, { status: 404 });
    }

    const weatherData = await fetchWeatherForField(
      field.latitude,
      field.longitude,
      field.bboxMinLat,
      field.bboxMinLon,
      field.bboxMaxLat,
      field.bboxMaxLon,
      30,
    );

    return NextResponse.json({
      data: weatherData,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
