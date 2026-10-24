import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Next.js excludes static assets from the standalone bundle by default.
cpSync(resolve(".next/static"), resolve(".next/standalone/.next/static"), { recursive: true });
// Standalone/manual projector packaging: runtime helpers and the EXACT read-model
// write contract only. No Worker sources, deployment config or D1 migrations.
cpSync(resolve("scripts"), resolve(".next/standalone/scripts"), { recursive: true });
mkdirSync(resolve(".next/standalone/cloudflare/read-model/queries"), { recursive: true });
cpSync(resolve("cloudflare/read-model/queries/project.sql"), resolve(".next/standalone/cloudflare/read-model/queries/project.sql"));
