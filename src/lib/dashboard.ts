import type { PoolClient } from "@neondatabase/serverless";

export type DashboardSort = "value" | "name" | "set";

export type DashboardCard = {
  id: number;
  name: string;
  setName: string | null;
  cardNumber: string | null;
  variant: string | null;
  rarity: string | null;
  quantity: number;
  unitPrice: number | null;
  lineValue: number;
  priceUpdatedAt: string | null;
};

type CardRow = {
  id: number;
  name: string;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  rarity: string | null;
  quantity: number | string;
  unit_price: number | string | null;
  price_updated_at: string | Date | null;
};

export type DashboardData = {
  cards: DashboardCard[];
  totalValue: number;
  totalQuantity: number;
  uniqueCards: number;
  lastPriceUpdate: string | null;
};

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapDashboardCard(row: CardRow): DashboardCard {
  const unitPrice = numberOrNull(row.unit_price);
  const quantity = Number(row.quantity);
  return {
    id: row.id,
    name: row.name,
    setName: row.set_name,
    cardNumber: row.card_number,
    variant: row.variant,
    rarity: row.rarity,
    quantity,
    unitPrice,
    lineValue: quantity * (unitPrice ?? 0),
    priceUpdatedAt: row.price_updated_at ? new Date(row.price_updated_at).toISOString() : null,
  };
}

export function sortDashboardCards(cards: DashboardCard[], sort: DashboardSort): DashboardCard[] {
  return [...cards].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name) || a.id - b.id;
    if (sort === "set") return (a.setName ?? "").localeCompare(b.setName ?? "") || a.name.localeCompare(b.name) || a.id - b.id;
    return b.lineValue - a.lineValue || a.name.localeCompare(b.name) || a.id - b.id;
  });
}

export function summarizeDashboardCards(cards: DashboardCard[]) {
  return {
    totalValue: cards.reduce((sum, card) => sum + card.lineValue, 0),
    totalQuantity: cards.reduce((sum, card) => sum + card.quantity, 0),
    uniqueCards: cards.length,
    lastPriceUpdate: cards.reduce<string | null>((latest, card) => {
      if (!card.priceUpdatedAt) return latest;
      return !latest || card.priceUpdatedAt > latest ? card.priceUpdatedAt : latest;
    }, null),
  };
}

export async function getDashboardData(client: Pick<PoolClient, "query">, ownerId: number): Promise<DashboardData> {
  const result = await client.query<CardRow>(
    `SELECT id, name, set_name, card_number, variant, rarity, quantity,
            current_market_price AS unit_price, price_updated_at
       FROM cards
      WHERE user_id = $1
      ORDER BY id`,
    [ownerId],
  );
  const cards = result.rows.map(mapDashboardCard);
  return { cards, ...summarizeDashboardCards(cards) };
}
