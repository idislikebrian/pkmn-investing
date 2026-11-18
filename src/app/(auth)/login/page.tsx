import { Navigation } from "@/components/Navigation";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h1>Login</h1>
        <p>Sign in with your email and password.</p>

        <LoginForm />
      </main>
    </div>
  );
}
