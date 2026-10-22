import type { PoolClient } from "pg";
export function createShareCode(): string;
export function allocateShareCode(client: Pick<PoolClient, "query">, siteId: string, generate?: () => string): Promise<string>;
