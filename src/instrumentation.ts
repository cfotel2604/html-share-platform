import { assertPostgresBackend } from "../scripts/metadata-backend.mjs";

export function register() {
  assertPostgresBackend();
}
