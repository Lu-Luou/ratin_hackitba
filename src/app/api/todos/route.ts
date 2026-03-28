import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  isDone: z.boolean().optional(),
});

export async function GET() {
  try {
    const { appUser } = await requireSessionContext();
    const where = appUser.role === Role.ADMIN ? {} : { userId: appUser.id };
    const todos = await prisma.todo.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      data: todos.map((todo) => ({
        id: todo.id,
        title: todo.title,
        isDone: todo.isDone,
        userId: todo.userId,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireSessionContext();
    const body = createTodoSchema.parse(await request.json());

    const todo = await prisma.todo.create({
      data: {
        title: body.title,
        isDone: body.isDone ?? false,
        userId: appUser.id,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: todo.id,
          title: todo.title,
          isDone: todo.isDone,
          userId: todo.userId,
          createdAt: todo.createdAt.toISOString(),
          updatedAt: todo.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}
