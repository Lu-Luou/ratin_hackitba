import type { SoyFuturesContract } from "@/types/field";

const SOY_SPOT_SYMBOL = "ZS=F";
const MOCK_SPOT_PRICE_USD_PER_TON = 425.95;
const MOCK_FUTURES: SoyFuturesContract[] = [
  {
    symbol: "ZSK26.CBT",
    label: "May 26",
    expiration: "2026-05-01",
    priceUsdPerTon: 429.1,
  },
  {
    symbol: "ZSN26.CBT",
    label: "Jul 26",
    expiration: "2026-07-01",
    priceUsdPerTon: 431.6,
  },
  {
    symbol: "ZSQ26.CBT",
    label: "Aug 26",
    expiration: "2026-08-01",
    priceUsdPerTon: 434.2,
  },
];

type SoyPricing = {
  spotSymbol: string;
  spotPriceUsdPerTon: number;
  futures: SoyFuturesContract[];
  fetchedAt: string;
  source: string;
  warning?: string;
};

export async function fetchSoyPricing(contractCount = 3): Promise<SoyPricing> {
  const futures = MOCK_FUTURES.slice(0, Math.max(1, contractCount));

  return {
    spotSymbol: SOY_SPOT_SYMBOL,
    spotPriceUsdPerTon: MOCK_SPOT_PRICE_USD_PER_TON,
    futures,
    fetchedAt: new Date().toISOString(),
    source: "yahoo",
  };
}
