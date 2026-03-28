import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, serializeAppUser, updateUserRoleById } from "@/lib/auth/session";

const updateRoleSchema = z.object({
  role: z.enum([Role.USER, Role.ADMIN]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSessionContext([Role.ADMIN]);
    const { id } = await context.params;
    const body = updateRoleSchema.parse(await request.json());
    const updated = await updateUserRoleById(id, body.role);

    return NextResponse.json({
      data: serializeAppUser(updated),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
