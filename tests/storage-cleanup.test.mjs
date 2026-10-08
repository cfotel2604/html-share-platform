import assert from "node:assert/strict";
import { test } from "node:test";
import { tsLoader } from "./helpers/load-ts.mjs";

test("S3 cleanup checks per-key errors even with HTTP 200", async t => {
  const previous = globalThis.__htmlShareS3;
  t.after(() => { if (previous) globalThis.__htmlShareS3 = previous; else delete globalThis.__htmlShareS3; });
  const commands = [];
  globalThis.__htmlShareS3 = { send: async command => { commands.push(command); return { Errors: [{ Code: "AccessDenied" }] }; } };
  const { removeFiles } = tsLoader()(new URL("../src/lib/storage.ts", import.meta.url));
  await removeFiles([]); assert.equal(commands.length, 0);
  await assert.rejects(removeFiles(["new-version/index.html"]), /staging objects/);
  assert.deepEqual(commands[0].input.Delete.Objects, [{ Key: "new-version/index.html" }]);
});
