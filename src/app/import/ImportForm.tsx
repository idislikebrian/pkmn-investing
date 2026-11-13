"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import { parseDexCsv, type DexParseResult } from "@/lib/import/dex";
import { importDexRows, type ImportResult } from "./actions";
import styles from "./import.module.css";

const money = (n: number | null) => (n === null ? "—" : `$${n.toFixed(2)}`);

export function ImportForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<DexParseResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (!file) {
      setParsed(null);
      setFileName(null);
      return;
    }
    // Decode from raw bytes (BOM-aware); File.text() would assume UTF-8.
    const bytes = new Uint8Array(await file.arrayBuffer());
    setFileName(file.name);
    setParsed(parseDexCsv(bytes));
  }

  function onImport() {
    if (!parsed) return;
    setError(null);
    startTransition(async () => {
      try {
        setResult(await importDexRows({ rows: parsed.rows, skipped: [...parsed.skipped, ...parsed.errors] }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  const units = parsed?.rows.reduce((sum, r) => sum + r.quantity, 0) ?? 0;
  const value = parsed?.rows.reduce((sum, r) => sum + r.quantity * (r.market_price ?? 0), 0) ?? 0;

  return (
    <div className={styles.stack}>
      <input type="file" accept=".csv,text/csv" onChange={onFile} aria-label="Dex CSV file" />

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle>Preview{fileName ? `: ${fileName}` : ""}</CardTitle>
            <CardDescription>
              {parsed.rows.length} cards, {units} total quantity, ${value.toFixed(2)} market value;{" "}
              {parsed.skipped.length} skipped, {parsed.errors.length} with errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsed.errors.length > 0 && (
              <ul className={styles.errors}>
                {parsed.errors.map((e) => (
                  <li key={`${e.line}-${e.reason}`}>
                    Line {e.line}
                    {e.name ? ` (${e.name})` : ""}: {e.reason}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Set</th>
                    <th>Number</th>
                    <th>Variant</th>
                    <th className={styles.num}>Qty</th>
                    <th className={styles.num}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr key={r.line}>
                      <td>{r.name}</td>
                      <td>{r.set_name}</td>
                      <td>{r.card_number}</td>
                      <td>{r.variant}</td>
                      <td className={styles.num}>{r.quantity}</td>
                      <td className={styles.num}>{money(r.market_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={onImport} disabled={pending || parsed.rows.length === 0}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p role="alert" className={styles.errors}>{error}</p>}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import complete</CardTitle>
            <CardDescription>
              <span data-testid="import-summary">
                Inserted {result.inserted}, updated {result.updated}, skipped {result.skipped.length}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.skipped.length > 0 && (
              <>
                <h4>Skipped</h4>
                <ul>
                  {result.skipped.map((s) => (
                    <li key={`${s.line}-${s.reason}`}>
                      Line {s.line}
                      {s.name ? ` (${s.name})` : ""}: {s.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h4>In the database but not in this file ({result.missingFromFile.length})</h4>
            {result.missingFromFile.length === 0 ? (
              <p>None.</p>
            ) : (
              <ul>
                {result.missingFromFile.map((c) => (
                  <li key={c.id}>
                    {c.name} — {c.set_name ?? "?"} {c.card_number ?? ""} {c.variant ? `(${c.variant})` : ""} × {c.quantity}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
