import { cpSync } from "node:fs";
import { resolve } from "node:path";

// Next.js excludes static assets from the standalone bundle by default.
cpSync(resolve(".next/static"), resolve(".next/standalone/.next/static"), { recursive: true });
