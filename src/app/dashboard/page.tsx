import { Navigation } from "@/components/Navigation";

export default function DashboardPage() {
  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <p>DashboardHeader would go here</p>
        <p>Portfolio Stats would go here</p>
        <p>PortfolioChart would go here</p>
        <p>CardsList would go here</p>
      </main>
    </div>
  );
}
