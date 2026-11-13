import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeBytes, NOT_COLLECTION_REASON, parseDexCsv } from "./dex";

const fixture = new Uint8Array(readFileSync(path.join(__dirname, "__fixtures__", "dex-sample.csv")));

describe("decodeBytes", () => {
  it("detects UTF-16 LE, UTF-16 BE and UTF-8 (with or without BOM)", () => {
    const le = new Uint8Array([0xff, 0xfe, 0x61, 0x00, 0x3b, 0x00]);
    const be = new Uint8Array([0xfe, 0xff, 0x00, 0x61, 0x00, 0x3b]);
    const u8bom = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x3b]);
    const u8 = new Uint8Array([0x61, 0x3b]);
    for (const bytes of [le, be, u8bom, u8]) expect(decodeBytes(bytes)).toBe("a;");
  });
});

describe("parseDexCsv", () => {
  const result = parseDexCsv(fixture);

  it("reads the UTF-16 fixture without errors", () => {
    expect(result.totalRecords).toBe(3);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });

  it("maps columns and strips $ and thousands separators from price", () => {
    expect(result.rows[0]).toEqual({
      line: 2,
      tcg_id: "fake1-7",
      name: "Pixelpup",
      set_name: "Imaginary Set",
      card_number: "7/50",
      variant: "Holo",
      rarity: "Rare Holo",
      series: "Fake Series",
      illustrator: "A. Painter",
      locale: "International",
      collection_name: "Test Binder",
      quantity: 2,
      market_price: 1234.5,
      notes: "Gift | Signed; kept sleeved",
    });
  });

  it("treats an empty price as null and empty notes as null", () => {
    expect(result.rows[1].market_price).toBeNull();
    expect(result.rows[1].notes).toBeNull();
  });

  it("skips non-collection rows with a reason", () => {
    expect(result.skipped).toEqual([{ line: 4, name: "Sparkmoth", reason: NOT_COLLECTION_REASON }]);
  });

  it("reports bad quantity and bad price as per-row errors", () => {
    const header =
      "Type;Category;Locale;Series;Set;Id;Number;Name;Variant;Rarity;Illustrator;Quantity;Price;Note 1;Note 2;Note 3;Note 4;Note 5";
    const csv = [
      header,
      "collection;c;l;s;set;x-1;1;Zero;Normal;r;i;0;$1.00;;;;;",
      "collection;c;l;s;set;x-2;2;Bad Price;Normal;r;i;1;abc;;;;;",
      "collection;c;l;s;set;x-3;3;Fine;Normal;r;i;3;$2;;;;;",
    ].join("\n");
    const out = parseDexCsv(new TextEncoder().encode(csv));
    expect(out.errors.map((e) => e.name)).toEqual(["Zero", "Bad Price"]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].market_price).toBe(2);
  });

  it("rejects collection rows with an empty or whitespace-only Id", () => {
    const header =
      "Type;Category;Locale;Series;Set;Id;Number;Name;Variant;Rarity;Illustrator;Quantity;Price;Note 1;Note 2;Note 3;Note 4;Note 5";
    const csv = [
      header,
      "collection;c;l;s;set;;1;No Id;Normal;r;i;1;$1.00;;;;;",
      "collection;c;l;s;set;   ;2;Blank Id;Normal;r;i;1;$1.00;;;;;",
      "collection;c;l;s;set;x-3;3;Has Id;Normal;r;i;1;$1.00;;;;;",
    ].join("\n");
    const out = parseDexCsv(new TextEncoder().encode(csv));
    expect(out.errors).toEqual([
      { line: 2, name: "No Id", reason: "missing card Id" },
      { line: 3, name: "Blank Id", reason: "missing card Id" },
    ]);
    expect(out.rows.map((r) => r.tcg_id)).toEqual(["x-3"]);
  });

  it("flags a file with the wrong header", () => {
    const out = parseDexCsv(new TextEncoder().encode("a;b\n1;2\n"));
    expect(out.rows).toEqual([]);
    expect(out.errors[0].reason).toMatch(/missing column/);
  });
});
