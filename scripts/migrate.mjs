// Runs every .sql file in db/migrations in filename order, once each.
// Applied files are recorded in schema_migrations. Usage: npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (run `vercel env pull .env.local --yes`).");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`apply  ${file}`);
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(`done: ${ran} applied, ${files.length - ran} already applied`);
} finally {
  await pool.end();
}
