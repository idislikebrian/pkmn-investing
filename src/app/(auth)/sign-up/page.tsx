import { Navigation } from "@/components/Navigation";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h1>Sign up</h1>
        <p>
          Creates a new account. It is not connected to any existing collection — claiming the
          owner account requires a one-time claim token.
        </p>

        <SignUpForm />
      </main>
    </div>
  );
}
