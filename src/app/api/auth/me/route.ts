import { NextResponse } from "next/server";
import { mapRouteError } from "@/lib/auth/http";
import { getSessionContext, serializeAppUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const { appUser } = await getSessionContext();

    return NextResponse.json({
      user: serializeAppUser(appUser),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
