import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext, SessionError } from "@/lib/auth/session";
import { buildFieldReportContext } from "@/lib/report/context";
import { generateLenderReport } from "@/lib/report/generation";
import { renderLenderReportPdf } from "@/lib/report/pdf";

type RouteContext = {
  params: Promise<{ fieldId: string }>;
};

const generateReportSchema = z.object({
  includeWebSearch: z.boolean().default(true),
  includeLiveFeatures: z.boolean().default(true),
  model: z.string().trim().min(2).max(120).optional(),
  format: z.enum(["json", "pdf"]).default("json"),
});

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireSessionContext();
    const { fieldId } = await context.params;
    const payload = generateReportSchema.parse(await request.json().catch(() => ({})));

    const reportContext = await buildFieldReportContext({
      appUser: {
        id: appUser.id,
        role: appUser.role,
      },
      fieldId,
      origin: request.nextUrl.origin,
      includeLiveFeatures: payload.includeLiveFeatures,
      cookieHeader: extractAuthTokenCookie(request.headers.get("cookie")),
    });

    if (!reportContext) {
      throw new SessionError(404, "Campo no encontrado.");
    }

    const report = await generateLenderReport({
      context: reportContext,
      includeWebSearch: payload.includeWebSearch,
      model: payload.model,
    });

    if (payload.format === "pdf") {
      const pdfBytes = await renderLenderReportPdf(reportContext, report);
      const bodyBytes = Uint8Array.from(pdfBytes);

      return new NextResponse(bodyBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=field-report-${fieldId}.pdf`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      data: {
        context: reportContext,
        report,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
