import { Navigation } from "@/components/Navigation";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ContinueButton } from "./continue-button";

export default async function LoginPage() {
  const user = await getSession();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h1>Login</h1>
        <p>Placeholder auth. Real login coming soon.</p>

        <ContinueButton />
      </main>
    </div>
  );
}
