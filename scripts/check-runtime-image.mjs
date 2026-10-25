import { execFileSync } from "node:child_process";

const image = process.argv[2];
if (!image || image.startsWith("-") || process.argv.length !== 3) {
  throw new Error("Usage: node scripts/check-runtime-image.mjs <image>");
}

// Run with the image's default user and no network/data mounts. Do not read env
// files or print file contents: this checks packaging before any DB migration.
const probe = String.raw`
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
assert.notEqual(process.getuid(), 0, "Runtime image must use a non-root user");
let files = 0;
function check(file) {
  const stat = fs.statSync(file);
  fs.accessSync(file, fs.constants.R_OK | (stat.isDirectory() ? fs.constants.X_OK : 0));
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(file)) check(path.join(file, entry));
  } else {
    const fd = fs.openSync(file, "r");
    fs.closeSync(fd);
    files++;
  }
}
for (const file of ["/app/package.json", "/app/server.js", "/app/scripts", "/app/db",
  "/app/cloudflare/read-model/queries/project.sql"]) check(file);
// Import the actual jobs' libraries: a missing contract must fail before rollout,
// rather than crash the projector only after the new services have started.
Promise.all([import("./scripts/lib/public-projector.mjs"), import("./scripts/lib/read-model-recovery.mjs")])
  .then(() => console.log(JSON.stringify({ result: "PASS", uid: process.getuid(), readableFiles: files, projectionLibraries: true })))
  .catch(() => { console.error("Runtime projection libraries are incomplete or unreadable"); process.exitCode = 1; });
`;

execFileSync("docker", [
  "run", "--rm", "--network", "none", "--read-only", "--entrypoint", "node",
  image, "-e", probe,
], { stdio: "inherit", windowsHide: true });
