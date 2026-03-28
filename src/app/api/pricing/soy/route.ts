import { NextResponse } from "next/server";
import { mapRouteError } from "@/lib/auth/http";
import { requireSessionContext } from "@/lib/auth/session";
import { fetchSoyPricing } from "@/lib/market/soyPricing";

export async function GET() {
  try {
    await requireSessionContext();

    const pricing = await fetchSoyPricing(3);

    return NextResponse.json({
      data: {
        currency: "USD",
        commodity: "soy",
        spotSymbol: pricing.spotSymbol,
        spotPriceUsdPerTon: pricing.spotPriceUsdPerTon,
        futures: pricing.futures,
        fetchedAt: pricing.fetchedAt,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
