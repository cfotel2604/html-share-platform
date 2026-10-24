import pg from "pg";
import { assertPostgresBackend } from "../../scripts/metadata-backend.mjs";

const globalDb = globalThis as typeof globalThis & { __htmlSharePool?: pg.Pool };

export function db(): pg.Pool {
  assertPostgresBackend();
  if (!globalDb.__htmlSharePool) {
    globalDb.__htmlSharePool = new pg.Pool({
      connectionTimeoutMillis: 5000,
      max: 8,
    });
  }
  return globalDb.__htmlSharePool;
}
