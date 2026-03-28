import { NextRequest, NextResponse } from "next/server";

type PredictRequest = {
  bbox: [number, number, number, number];
  start_date?: string;
  end_date?: string;
};

type PredictResponse = {
  features?: Record<string, number>;
  predictions?: number[];
  warning?: string;
  error?: string;
};

/**
 * Proxy endpoint for the Python prediction API.
 * Routes prediction requests to the Python handler (either local or Vercel).
 */
export async function POST(request: NextRequest): Promise<NextResponse<PredictResponse>> {
  try {
    const body = (await request.json().catch(() => ({}))) as PredictRequest;

    // Validate required fields
    if (!Array.isArray(body.bbox) || body.bbox.length !== 4) {
      return NextResponse.json(
        { error: "Missing or invalid bbox parameter. Expected [minLon, minLat, maxLon, maxLat]." },
        { status: 400 }
      );
    }

    // Determine the Python API endpoint
    const pythonApiUrl = getPythonApiUrl(request);
    console.log(`[PREDICT] Forwarding request to Python API at: ${pythonApiUrl}`);

    // Call the Python API
    const response = await fetch(pythonApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[PREDICT] Python API returned ${response.status}: ${response.statusText}`);
      const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
      return NextResponse.json(
        { error: errorBody.error ?? `Python API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = (await response.json()) as PredictResponse;
    console.log(`[PREDICT] Python API response:`, {
      hasPredictions: !!result.predictions,
      hasWarning: !!result.warning,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[PREDICT] Error calling Python API:`, message);
    return NextResponse.json(
      { error: `Failed to predict: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { status: "ok", message: "POST a bbox to get yield predictions." },
    { status: 200 }
  );
}

/**
 * Determine the Python API endpoint based on environment and request context.
 * - In Vercel production: the request is already at the Python handler
 * - In local dev: might need to call external Python server or a stub
 */
function getPythonApiUrl(request: NextRequest): string {
  // Check for explicit Python API URL in environment
  if (process.env.PYTHON_API_URL) {
    return `${process.env.PYTHON_API_URL.replace(/\/$/, "")}/predict`;
  }

  // In Vercel production, the Python handler is accessible via relative URL
  // (Vercel merges both Next.js and Python endpoints)
  if (process.env.VERCEL) {
    const origin = request.nextUrl.origin;
    return `${origin}/py/predict`;
  }

  // Fallback: try localhost Python API on default port (5000)
  // This assumes a local Flask/Python server is running
  return "http://localhost:5000/predict";
}
