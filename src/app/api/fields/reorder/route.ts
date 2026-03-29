import { NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const reorderFieldsSchema = z.object({
  orderedFieldIds: z.array(z.string().min(1)).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const { appUser } = await requireSessionContext();
    const body = reorderFieldsSchema.parse(await request.json());

    const userFields = await prisma.field.findMany({
      where: {
        userId: appUser.id,
      },
      select: {
        id: true,
      },
      take: 200,
    });

    const persistedIds = userFields.map((field) => field.id);

    if (persistedIds.length !== body.orderedFieldIds.length) {
      return NextResponse.json(
        {
          error: "La cantidad de campos enviados no coincide con los campos del usuario.",
        },
        { status: 400 },
      );
    }

    const persistedSet = new Set(persistedIds);
    const payloadSet = new Set(body.orderedFieldIds);

    if (persistedSet.size !== payloadSet.size) {
      return NextResponse.json(
        {
          error: "El orden enviado contiene IDs duplicados.",
        },
        { status: 400 },
      );
    }

    const containsUnknownField = body.orderedFieldIds.some((fieldId) => !persistedSet.has(fieldId));

    if (containsUnknownField) {
      return NextResponse.json(
        {
          error: "El orden enviado incluye campos no validos para este usuario.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      body.orderedFieldIds.map((fieldId, index) =>
        prisma.field.updateMany({
          where: {
            id: fieldId,
            userId: appUser.id,
          },
          data: {
            sortOrder: index,
          },
        }),
      ),
    );

    return NextResponse.json({
      data: {
        orderedFieldIds: body.orderedFieldIds,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
