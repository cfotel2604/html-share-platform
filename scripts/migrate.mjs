import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const MIGRATION_NAME = /^(\d{4})_[a-z0-9_]+\.sql$/;
const LOCK_KEY = 487291;

export async function loadMigrations(directory = migrationsDir) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const versions = new Set();
  const migrations = [];

  for (const name of names) {
    const match = MIGRATION_NAME.exec(name);
    if (!match || versions.has(match[1])) {
      throw new Error(`Invalid or duplicate migration version: ${name}`);
    }
    versions.add(match[1]);
    const sql = await readFile(join(directory, name), "utf8");
    if (!sql.trim()) throw new Error(`Empty migration: ${name}`);
    migrations.push({
      name,
      version: match[1],
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }

  return migrations;
}

export async function migrate(client, directory = migrationsDir) {
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        name text NOT NULL,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of await loadMigrations(directory)) {
      await client.query("BEGIN");
      try {
        const existing = await client.query(
          "SELECT name, checksum FROM schema_migrations WHERE version = $1",
          [migration.version],
        );
        if (existing.rowCount) {
          if (existing.rows[0].name !== migration.name || existing.rows[0].checksum !== migration.checksum) {
            throw new Error(`Previously applied migration changed: ${migration.name}`);
          }
        } else {
          await client.query(migration.sql);
          await client.query(
            "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
            [migration.version, migration.name, migration.checksum],
          );
          console.log(`Applied ${migration.name}`);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const client = new pg.Client({ connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await migrate(client);
    console.log("Database migrations are current");
  } catch (error) {
    console.error("Database migration failed:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}
