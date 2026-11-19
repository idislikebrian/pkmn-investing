import { Navigation } from "@/components/Navigation";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ClaimForm } from "./claim-form";

/**
 * Explicit owner-claim page (COB-812, G1 #5).
 * Signing up NEVER binds to the legacy owner row. The operator issues a one-time
 * claim token (scripts/generate-owner-claim.mjs); the signed-in new user redeems it here.
 */
export default async function ClaimPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h1>Claim owner account</h1>
        <p>
          Redeem the one-time claim token issued by the operator to bind this account to the
          legacy owner row. Signing up alone does not grant ownership.
        </p>
        <ClaimForm />
      </main>
    </div>
  );
}
