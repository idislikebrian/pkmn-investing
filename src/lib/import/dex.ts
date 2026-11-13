// Parser for the Dex app collection export (semicolon-delimited, usually UTF-16 LE with a BOM).

export interface DexRow {
  line: number; // 1-based line in the file's record order (header = 1)
  tcg_id: string | null;
  name: string;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  rarity: string | null;
  series: string | null;
  illustrator: string | null;
  locale: string | null;
  collection_name: string | null;
  quantity: number;
  market_price: number | null;
  notes: string | null;
}

export interface DexIssue {
  line: number;
  name: string | null;
  reason: string;
}

export interface DexParseResult {
  rows: DexRow[];
  errors: DexIssue[]; // malformed collection rows
  skipped: DexIssue[]; // rows deliberately ignored (e.g. wishlist)
  totalRecords: number; // data records, excluding the header
}

export const NOT_COLLECTION_REASON = "not a collection row";

const EXPECTED_HEADER = [
  "Type", "Category", "Locale", "Series", "Set", "Id", "Number", "Name", "Variant",
  "Rarity", "Illustrator", "Quantity", "Price", "Note 1", "Note 2", "Note 3", "Note 4", "Note 5",
];

/** Decode raw bytes using the BOM: FF FE = utf-16le, FE FF = utf-16be, EF BB BF or none = utf-8. */
export function decodeBytes(bytes: Uint8Array): string {
  let encoding = "utf-8";
  let offset = 0;
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
    offset = 2;
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = "utf-16be";
    offset = 2;
  } else if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  }
  return new TextDecoder(encoding).decode(bytes.subarray(offset));
}

/** Minimal RFC 4180-style parser with a custom delimiter; handles quoted fields, "" escapes, CRLF. */
export function parseDelimited(text: string, delimiter = ";"): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAny = false;

  const endRecord = () => {
    record.push(field);
    field = "";
    // Ignore completely blank lines.
    if (record.length > 1 || record[0] !== "") records.push(record);
    record = [];
    sawAny = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    sawAny = true;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord();
    } else {
      field += ch;
    }
  }
  if (sawAny) endRecord();
  return records;
}

const clean = (v: string | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

function parsePrice(raw: string | undefined): { value: number | null; error?: string } {
  const t = (raw ?? "").trim();
  if (t === "") return { value: null };
  const stripped = t.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(stripped)) return { value: null, error: `invalid price "${t}"` };
  return { value: Math.round(Number(stripped) * 100) / 100 };
}

export function parseDexCsv(bytes: Uint8Array): DexParseResult {
  const records = parseDelimited(decodeBytes(bytes), ";");
  const result: DexParseResult = { rows: [], errors: [], skipped: [], totalRecords: 0 };
  if (records.length === 0) return result;

  const header = records[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h] = i));
  const missing = EXPECTED_HEADER.filter((h) => !(h in idx));
  if (missing.length > 0) {
    result.errors.push({ line: 1, name: null, reason: `missing column(s): ${missing.join(", ")}` });
    return result;
  }
  const get = (rec: string[], col: string) => rec[idx[col]];

  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const line = r + 1;
    result.totalRecords++;
    const name = clean(get(rec, "Name"));

    if (get(rec, "Type")?.trim().toLowerCase() !== "collection") {
      result.skipped.push({ line, name, reason: NOT_COLLECTION_REASON });
      continue;
    }
    if (!name) {
      result.errors.push({ line, name, reason: "missing name" });
      continue;
    }

    const qtyRaw = (get(rec, "Quantity") ?? "").trim();
    if (!/^\d+$/.test(qtyRaw) || Number(qtyRaw) < 1) {
      result.errors.push({ line, name, reason: `invalid quantity "${qtyRaw}" (need an integer >= 1)` });
      continue;
    }

    const price = parsePrice(get(rec, "Price"));
    if (price.error) {
      result.errors.push({ line, name, reason: price.error });
      continue;
    }

    const notes = [1, 2, 3, 4, 5]
      .map((n) => clean(get(rec, `Note ${n}`)))
      .filter((n): n is string => n !== null)
      .join(" | ");

    result.rows.push({
      line,
      tcg_id: clean(get(rec, "Id")),
      name,
      set_name: clean(get(rec, "Set")),
      card_number: clean(get(rec, "Number")),
      variant: clean(get(rec, "Variant")),
      rarity: clean(get(rec, "Rarity")),
      series: clean(get(rec, "Series")),
      illustrator: clean(get(rec, "Illustrator")),
      locale: clean(get(rec, "Locale")),
      collection_name: clean(get(rec, "Category")),
      quantity: Number(qtyRaw),
      market_price: price.value,
      notes: notes === "" ? null : notes,
    });
  }
  return result;
}
