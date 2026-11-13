"use server";

import { Pool } from "@neondatabase/serverless";
import { getOwnerUserId } from "@/lib/owner";
import type { DexIssue, DexRow } from "@/lib/import/dex";

export interface MissingCard {
  id: number;
  name: string;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  quantity: number;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: DexIssue[];
  missingFromFile: MissingCard[];
}

// Same card = (tcg_id, variant, condition, grading_company, grade); imports never set the last three.
const keyOf = (tcgId: string | null, variant: string | null, condition: string | null, company: string | null, grade: string | number | null) =>
  [tcgId, variant, condition, company, grade === null ? null : Number(grade)].map((v) => v ?? "").join("|");

const UPSERT = `
  INSERT INTO cards (
    user_id, tcg_id, name, set_name, card_number, variant, rarity, series, illustrator,
    locale, collection_name, quantity, current_market_price, price_updated_at, notes
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::numeric,
    CASE WHEN $13::numeric IS NULL THEN NULL ELSE now() END, $14
  )
  ON CONFLICT (user_id, tcg_id, variant, condition, grading_company, grade) DO UPDATE SET
    name = EXCLUDED.name,
    set_name = EXCLUDED.set_name,
    card_number = EXCLUDED.card_number,
    rarity = EXCLUDED.rarity,
    series = EXCLUDED.series,
    illustrator = EXCLUDED.illustrator,
    locale = EXCLUDED.locale,
    collection_name = EXCLUDED.collection_name,
    notes = EXCLUDED.notes,
    quantity = EXCLUDED.quantity,
    current_market_price = COALESCE(EXCLUDED.current_market_price, cards.current_market_price),
    price_updated_at = CASE WHEN EXCLUDED.current_market_price IS NULL
                            THEN cards.price_updated_at ELSE now() END,
    updated_at = now()
  RETURNING id, (xmax = 0) AS inserted
`;

export async function importDexRows(input: { rows: DexRow[]; skipped: DexIssue[] }): Promise<ImportResult> {
  // Checked on the server so hiding the UI is not the only protection.
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Import is only available in development.");
  }

  const skipped: DexIssue[] = [...input.skipped];
  const merged = new Map<string, DexRow>();
  for (const row of input.rows) {
    if (!row.name || !Number.isInteger(row.quantity) || row.quantity < 1) {
      skipped.push({ line: row.line, name: row.name ?? null, reason: "invalid row (name or quantity)" });
      continue;
    }
    // The same card listed twice in one file would hit the same row twice; combine the quantities.
    const key = keyOf(row.tcg_id, row.variant, null, null, null);
    const prior = merged.get(key);
    merged.set(key, prior ? { ...prior, quantity: prior.quantity + row.quantity } : row);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = await getOwnerUserId(client);
    let inserted = 0;
    let updated = 0;

    for (const r of merged.values()) {
      const res = await client.query<{ id: number; inserted: boolean }>(UPSERT, [
        userId, r.tcg_id, r.name, r.set_name, r.card_number, r.variant, r.rarity, r.series,
        r.illustrator, r.locale, r.collection_name, r.quantity, r.market_price, r.notes,
      ]);
      if (res.rows[0].inserted) inserted++;
      else updated++;
      if (r.market_price !== null) {
        await client.query("INSERT INTO price_snapshots (card_id, source, price) VALUES ($1, 'dex', $2)", [
          res.rows[0].id,
          r.market_price,
        ]);
      }
    }

    const existing = await client.query<MissingCard & { tcg_id: string | null; condition: string | null; grading_company: string | null; grade: string | null }>(
      "SELECT id, tcg_id, name, set_name, card_number, variant, condition, grading_company, grade, quantity FROM cards WHERE user_id = $1 ORDER BY name, id",
      [userId],
    );
    await client.query("COMMIT");

    const fileKeys = new Set(merged.keys());
    const missingFromFile = existing.rows
      .filter((c) => !fileKeys.has(keyOf(c.tcg_id, c.variant, c.condition, c.grading_company, c.grade)))
      .map(({ id, name, set_name, card_number, variant, quantity }) => ({ id, name, set_name, card_number, variant, quantity }));

    return { inserted, updated, skipped, missingFromFile };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
