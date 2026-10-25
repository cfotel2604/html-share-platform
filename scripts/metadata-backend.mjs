// ADR-0006: this is a rejection boundary, never a backend selector or fallback.
export function assertPostgresBackend(environment = process.env) {
  if (environment.METADATA_BACKEND !== undefined && environment.METADATA_BACKEND !== 'postgres') {
    throw new Error('METADATA_BACKEND must be postgres; the Cloudflare administration backend has been removed');
  }
}
