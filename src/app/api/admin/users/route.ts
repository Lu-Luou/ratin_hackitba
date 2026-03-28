import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, serializeAppUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSessionContext([Role.ADMIN]);

    const users = await prisma.appUser.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      data: users.map(serializeAppUser),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
