import { NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { registerWithEmailPassword, serializeAppUser } from "@/lib/auth/session";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(2).max(120).optional(),
  farmName: z.string().trim().min(2).max(160).optional(),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const { appUser } = await registerWithEmailPassword(body.email, body.password, {
      name: body.name,
      farmName: body.farmName,
    });

    return NextResponse.json(
      {
        message: "Cuenta creada.",
        user: serializeAppUser(appUser),
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}
