import pg from "pg";

const globalDb = globalThis as typeof globalThis & { __htmlSharePool?: pg.Pool };

export function db(): pg.Pool {
  if(process.env.METADATA_BACKEND && process.env.METADATA_BACKEND!=="postgres") throw new Error("PostgreSQL is disabled for this backend");
  if (!globalDb.__htmlSharePool) {
    globalDb.__htmlSharePool = new pg.Pool({
      connectionTimeoutMillis: 5000,
      max: 8,
    });
  }
  return globalDb.__htmlSharePool;
}
