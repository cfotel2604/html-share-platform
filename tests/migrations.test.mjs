import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadMigrations } from "../scripts/migrate.mjs";

test("loads migration versions in order and fingerprints SQL content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "html-share-migration-"));
  try {
    await writeFile(join(dir, "0002_second.sql"), "SELECT 2;");
    await writeFile(join(dir, "0001_first.sql"), "SELECT 1;");
    const found = await loadMigrations(dir);
    assert.deepEqual(found.map((migration) => migration.version), ["0001", "0002"]);
    assert.notEqual(found[0].checksum, found[1].checksum);
    await writeFile(join(dir, "0001_first.sql"), "SELECT 3;");
    const changed = await loadMigrations(dir);
    assert.notEqual(changed[0].checksum, found[0].checksum);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects ambiguous migration versions instead of silently skipping SQL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "html-share-migration-"));
  try {
    await writeFile(join(dir, "0001_first.sql"), "SELECT 1;");
    await writeFile(join(dir, "0001_other.sql"), "SELECT 2;");
    await assert.rejects(loadMigrations(dir), /duplicate migration version/);
    await rm(join(dir, "0001_other.sql"));
    await writeFile(join(dir, "wrong.sql"), "SELECT 3;");
    await assert.rejects(loadMigrations(dir), /Invalid or duplicate migration version/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
