-- 001_dex_import: columns and identity key needed to import a Dex app collection export.
-- db/schema.sql stays as the baseline; this layers on top of it.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS tcg_id          TEXT,   -- pokemontcg.io-style id, e.g. base4-4, cel25c-17_A
  ADD COLUMN IF NOT EXISTS variant         TEXT,
  ADD COLUMN IF NOT EXISTS rarity          TEXT,
  ADD COLUMN IF NOT EXISTS series          TEXT,
  ADD COLUMN IF NOT EXISTS illustrator     TEXT,
  ADD COLUMN IF NOT EXISTS locale          TEXT,
  ADD COLUMN IF NOT EXISTS collection_name TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT;

-- "The same card" = same owner, TCG id, variant, condition and grading details.
-- NULLS NOT DISTINCT (Postgres 15+) makes NULLs compare equal, so two rows that
-- differ only by NULL vs NULL still collide and ON CONFLICT can target this index.
CREATE UNIQUE INDEX IF NOT EXISTS cards_identity_uidx
  ON cards (user_id, tcg_id, variant, condition, grading_company, grade)
  NULLS NOT DISTINCT;
