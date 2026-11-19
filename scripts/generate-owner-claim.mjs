// Owner-claim token generator (COB-812, G1 #5).
//
// Usage (operator, with the users row id to be claimed):
//   node scripts/generate-owner-claim.mjs <users_row_id>
//
// Prints a one-time claim token and the SQL to store ONLY its SHA-256 hash.
// This script deliberately does NOT connect to the database — the operator
// runs the printed INSERT themselves (e.g. via the migration/SQL console).

import { createHash, randomBytes } from "node:crypto";

const usersRowId = Number(process.argv[2]);
if (!Number.isInteger(usersRowId) || usersRowId < 1) {
  console.error("Usage: node scripts/generate-owner-claim.mjs <users_row_id>");
  process.exit(1);
}

const token = randomBytes(32).toString("hex"); // one-time secret; shown once, never stored
const tokenHash = createHash("sha256").update(token).digest("hex");

console.log("Share this token with the owner out-of-band (shown once):");
console.log(`  TOKEN: ${token}`);
console.log("\nThen store only its hash (expires in 24h by default):");
console.log(
  `  INSERT INTO owner_claims (users_row_id, token_hash) VALUES (${usersRowId}, '${tokenHash}');`,
);
console.log("\nThe signed-in owner redeems it at /claim.");
