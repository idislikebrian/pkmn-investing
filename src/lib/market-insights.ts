// lib/market-insights.ts

/**
 * Placeholder types + exports.
 * Purely to satisfy type imports during dev/build.
 * No real logic yet.
 */

export type MarketTrend = {
  id: string;
  label: string;
  direction?: "up" | "down" | "flat";
  confidence?: number;
};

export type PriceAlert = {
  id: string;
  asset: string;
  targetPrice: number;
  triggered: boolean;
};

export type WishlistItem = {
  id: string;
  name: string;
  note?: string;
};

// Optional no-op helpers in case you import values later
export const marketTrends: MarketTrend[] = [];
export const priceAlerts: PriceAlert[] = [];
export const wishlist: WishlistItem[] = [];

export default {};
