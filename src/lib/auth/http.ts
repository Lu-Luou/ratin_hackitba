import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SessionError } from "@/lib/auth/session";

export function mapRouteError(error: unknown) {
  if (error instanceof SessionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Payload invalido.",
        details: error.issues,
      },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : "Error interno.";
  return NextResponse.json({ error: message }, { status: 500 });
}
