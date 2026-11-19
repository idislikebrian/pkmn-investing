import { Navigation } from "@/components/Navigation";
import { redirect } from "next/navigation";
import { importAccess } from "@/lib/import-gate";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  const access = await importAccess();

  // Server-side gate (COB-812): unauthenticated users are sent to sign-in; in
  // non-development environments the import stays closed until end-to-end
  // verification (operator sets IMPORT_E2E_VERIFIED=1; see COB-798).
  if (!access.allowed && access.reason === "unauthenticated") redirect("/login");

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h2>Import Dex collection</h2>
        {!access.allowed ? (
          <p>The import is closed until end-to-end verification completes.</p>
        ) : (
          <>
            <p>Pick a Dex app CSV export. It is parsed in your browser and previewed before anything is saved.</p>
            <ImportForm />
          </>
        )}
      </main>
    </div>
  );
}
