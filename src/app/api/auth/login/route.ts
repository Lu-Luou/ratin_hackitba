import { NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { serializeAppUser, signInWithEmailPassword } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(72),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const { appUser } = await signInWithEmailPassword(body.email, body.password);

    return NextResponse.json({
      message: "Sesion iniciada.",
      user: serializeAppUser(appUser),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
