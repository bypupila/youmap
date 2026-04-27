import { neon } from "@neondatabase/serverless";
import { readRequiredEnv, sanitizeEnvValue } from "@/lib/env";

type NeonSqlClient = ReturnType<typeof neon>;
let rawSqlClient: NeonSqlClient | null = null;

/**
 * Resolve the Postgres connection string in priority order:
 *
 *   1. DATABASE_URL          - what local/dev/CI typically set explicitly.
 *   2. NEON_DATABASE_URL     - injected by the Vercel Marketplace Neon
 *                              integration on this project.
 *   3. POSTGRES_URL          - alias also provisioned by some setups.
 *   4. NEON_POSTGRES_URL     - pooled alias from the marketplace.
 *
 * Without this fallback the app would crash at boot whenever it was
 * provisioned through the Vercel marketplace integration (which only sets
 * the `NEON_*` flavours) and nothing mirrored the value into
 * `DATABASE_URL`. That broke every Neon-backed API route - register, login,
 * channel resolution, etc. - and made the whole app fall through to
 * read-only demo mode.
 */
function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.NEON_POSTGRES_URL,
  ];
  for (const candidate of candidates) {
    const value = sanitizeEnvValue(candidate);
    if (value) return value;
  }
  // Preserve the original error contract when nothing is set so callers
  // see the exact same "DATABASE_URL is required." message they used to.
  return readRequiredEnv(process.env.DATABASE_URL, "DATABASE_URL");
}

function getRawSqlClient() {
  if (!rawSqlClient) {
    rawSqlClient = neon(resolveDatabaseUrl());
  }
  return rawSqlClient;
}

type RowShape = Record<string, unknown>;

type TypedSql = {
  <T = RowShape>(strings: TemplateStringsArray, ...params: unknown[]): Promise<T>;
  query<T = RowShape>(queryWithPlaceholders: string, params?: unknown[]): Promise<T>;
  unsafe: NeonSqlClient["unsafe"];
  transaction: NeonSqlClient["transaction"];
};

const typedSql = (<T = RowShape>(
  strings: TemplateStringsArray,
  ...params: unknown[]
) => getRawSqlClient()(strings, ...params) as unknown as Promise<T>) as TypedSql;

typedSql.query = <T = RowShape>(queryWithPlaceholders: string, params?: unknown[]) =>
  getRawSqlClient().query(queryWithPlaceholders, params) as unknown as Promise<T>;
typedSql.unsafe = ((...args: Parameters<NeonSqlClient["unsafe"]>) => getRawSqlClient().unsafe(...args)) as NeonSqlClient["unsafe"];
typedSql.transaction = ((...args: Parameters<NeonSqlClient["transaction"]>) => getRawSqlClient().transaction(...args)) as NeonSqlClient["transaction"];

export const sql = typedSql;
