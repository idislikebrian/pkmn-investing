import { Navigation } from "@/components/Navigation";
import { GradingDashboard } from "@/components/GradingDashboard";

export default function GradingPage() {
  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h2>Grading Insights</h2>
        <div>
          <p>
            Stay informed with real-time market trends, price alerts, and your
            wishlist
          </p>
        </div>

        <GradingDashboard />
      </main>
    </div>
  );
}
