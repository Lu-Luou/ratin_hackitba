import { NextRequest, NextResponse } from "next/server";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, SessionError } from "@/lib/auth/session";
import { buildFieldReportContext } from "@/lib/report/context";

type RouteContext = {
  params: Promise<{ fieldId: string }>;
};

function parseBoolean(value: string | null, defaultValue: boolean) {
  if (value === null) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function extractAuthTokenCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";");
  const authCookie = cookies
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.includes("auth-token="));

  return authCookie && authCookie.length > 0 ? authCookie : undefined;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;
    const includeLiveFeatures = parseBoolean(request.nextUrl.searchParams.get("includeLiveFeatures"), true);

    const reportContext = await buildFieldReportContext({
      appUser: {
        id: appUser.id,
        role: appUser.role,
      },
      fieldId,
      origin: request.nextUrl.origin,
      includeLiveFeatures,
      cookieHeader: extractAuthTokenCookie(request.headers.get("cookie")),
    });

    if (!reportContext) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    return NextResponse.json({
      data: reportContext,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
