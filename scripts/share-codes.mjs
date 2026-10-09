import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function createShareCode() {
  return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

// Call while holding the site row lock. Conflicts include revoked tombstones.
export async function allocateShareCode(client, siteId, generate = createShareCode) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generate();
    if (!/^[A-Za-z0-9]{10}$/.test(code)) throw new Error("Invalid generated share code");
    const inserted = await client.query(
      "INSERT INTO site_share_links(code,site_id) VALUES($1,$2) ON CONFLICT(code) DO NOTHING RETURNING code",
      [code, siteId],
    );
    if (inserted.rowCount) return code;
  }
  throw new Error("Share code allocation exhausted");
}
