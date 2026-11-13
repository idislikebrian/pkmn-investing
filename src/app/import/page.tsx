import { notFound } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  // Server-side gate: this page only exists in local development.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="page">
      <Navigation />
      <main className="main">
        <h2>Import Dex collection</h2>
        <p>Pick a Dex app CSV export. It is parsed in your browser and previewed before anything is saved.</p>
        <ImportForm />
      </main>
    </div>
  );
}
