-- pkmn-investing schema
-- Matches the columns src/lib/grading-ai.ts reads today (id, user_id, name, set_name,
-- condition, current_market_price, graded), plus the basics a portfolio needs.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  privy_id    TEXT UNIQUE,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  set_name              TEXT,
  card_number           TEXT,
  condition             TEXT,              -- raw condition: NM, LP, MP, HP, DMG
  graded                BOOLEAN NOT NULL DEFAULT false,
  grading_company       TEXT,              -- PSA, BGS, CGC
  grade                 NUMERIC(3,1),
  quantity              INTEGER NOT NULL DEFAULT 1,
  purchase_price        NUMERIC(10,2),
  purchase_date         DATE,
  current_market_price  NUMERIC(10,2),
  price_updated_at      TIMESTAMPTZ,
  pricecharting_id      TEXT,
  tcgplayer_id          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id);
CREATE INDEX IF NOT EXISTS cards_user_graded_idx ON cards(user_id, graded);

-- Price history so the market/dashboard pages can chart value over time
CREATE TABLE IF NOT EXISTS price_snapshots (
  id           BIGSERIAL PRIMARY KEY,
  card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  source       TEXT NOT NULL,             -- pricecharting, tcgplayer, ebay
  price        NUMERIC(10,2) NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_snapshots_card_idx ON price_snapshots(card_id, captured_at DESC);
