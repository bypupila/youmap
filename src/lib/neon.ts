import { neon } from "@neondatabase/serverless";
import { readRequiredEnv } from "@/lib/env";

type NeonSqlClient = ReturnType<typeof neon>;
let rawSqlClient: NeonSqlClient | null = null;

function getRawSqlClient() {
  if (!rawSqlClient) {
    const databaseUrl = readRequiredEnv(process.env.DATABASE_URL, "DATABASE_URL");
    rawSqlClient = neon(databaseUrl);
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
