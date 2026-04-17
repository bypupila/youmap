import { neon } from "@neondatabase/serverless";
import { readRequiredEnv } from "@/lib/env";

const databaseUrl = readRequiredEnv(process.env.DATABASE_URL, "DATABASE_URL");
const rawSql = neon(databaseUrl);

type RowShape = Record<string, unknown>;

type TypedSql = {
  <T = RowShape>(strings: TemplateStringsArray, ...params: unknown[]): Promise<T>;
  query<T = RowShape>(queryWithPlaceholders: string, params?: unknown[]): Promise<T>;
  unsafe: typeof rawSql.unsafe;
  transaction: typeof rawSql.transaction;
};

const typedSql = (<T = RowShape>(
  strings: TemplateStringsArray,
  ...params: unknown[]
) => rawSql(strings, ...params) as unknown as Promise<T>) as TypedSql;

typedSql.query = <T = RowShape>(queryWithPlaceholders: string, params?: unknown[]) =>
  rawSql.query(queryWithPlaceholders, params) as unknown as Promise<T>;
typedSql.unsafe = rawSql.unsafe;
typedSql.transaction = rawSql.transaction;

export const sql = typedSql;
