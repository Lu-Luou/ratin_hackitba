import { NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { registerWithEmailPassword, serializeAppUser } from "@/lib/auth/session";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(72),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const { appUser } = await registerWithEmailPassword(body.email, body.password);

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
