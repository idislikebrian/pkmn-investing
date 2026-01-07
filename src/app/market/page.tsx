import { Navigation } from "@/components/Navigation";
import { MarketInsights } from "@/components/MarketInsights";

export default function MarketPage() {
  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h2>Market Insights</h2>
        <div>
          <p>
            Stay informed with real-time market trends, price alerts, and your
            wishlist
          </p>
        </div>

        <MarketInsights />
      </main>
    </div>
  );
}
