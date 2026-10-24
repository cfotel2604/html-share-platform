// A' local rehearsal only: empty PGlite/D1/R2 fixtures, no runtime credentials.
// The retired Node viewer/public gateway is never used or contacted.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
execFileSync(process.execPath,['--test','tests/public-worker-runtime.test.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});
