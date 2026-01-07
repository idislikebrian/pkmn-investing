import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Navigation } from "@/components/Navigation";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

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
