import { describe, expect, it } from "vitest";
import { mapDashboardCard, sortDashboardCards, summarizeDashboardCards } from "./dashboard";

const cards = [
  mapDashboardCard({ id: 1, name: "Charizard", set_name: "Base Set 2", card_number: "4", variant: null, rarity: "Rare", quantity: 2, unit_price: "244.28", price_updated_at: "2026-11-25T10:00:00Z" }),
  mapDashboardCard({ id: 2, name: "Bulbasaur", set_name: "Base Set", card_number: "44", variant: "Reverse Holo", rarity: "Common", quantity: 3, unit_price: null, price_updated_at: null }),
  mapDashboardCard({ id: 3, name: "Abra", set_name: "Jungle", card_number: "43", variant: null, rarity: "Common", quantity: 1, unit_price: 10, price_updated_at: "2026-11-24T10:00:00Z" }),
];

describe("dashboard data", () => {
  it("calculates totals and treats missing prices as zero", () => {
    expect(summarizeDashboardCards(cards)).toEqual({ totalValue: 498.56, totalQuantity: 6, uniqueCards: 3, lastPriceUpdate: "2026-11-25T10:00:00.000Z" });
  });

  it("sorts by value, name, and set without mutating the input", () => {
    expect(sortDashboardCards(cards, "value").map((card) => card.name)).toEqual(["Charizard", "Abra", "Bulbasaur"]);
    expect(sortDashboardCards(cards, "name").map((card) => card.name)).toEqual(["Abra", "Bulbasaur", "Charizard"]);
    expect(sortDashboardCards(cards, "set").map((card) => card.name)).toEqual(["Bulbasaur", "Charizard", "Abra"]);
    expect(cards.map((card) => card.name)).toEqual(["Charizard", "Bulbasaur", "Abra"]);
  });
});
