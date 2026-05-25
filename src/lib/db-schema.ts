import { sql } from "@/lib/neon";

const tableCache = new Map<string, Promise<boolean>>();
const columnCache = new Map<string, Promise<boolean>>();

function tableKey(schema: string, table: string) {
  return `${schema}.${table}`;
}

function columnKey(schema: string, table: string, column: string) {
  return `${schema}.${table}.${column}`;
}

export async function tableExists(schema: string, table: string) {
  const key = tableKey(schema, table);
  if (!tableCache.has(key)) {
    tableCache.set(
      key,
      sql
        .query<Array<{ exists: boolean }>>("select to_regclass($1) is not null as exists", [key])
        .then((rows) => Boolean(rows[0]?.exists))
        .catch(() => false)
    );
  }
  return tableCache.get(key)!;
}

export async function columnExists(schema: string, table: string, column: string) {
  const key = columnKey(schema, table, column);
  if (!columnCache.has(key)) {
    columnCache.set(
      key,
      sql
        .query<Array<{ exists: boolean }>>(
          `select exists (
             select 1
             from information_schema.columns
             where table_schema = $1
               and table_name = $2
               and column_name = $3
           ) as exists`,
          [schema, table, column]
        )
        .then((rows) => Boolean(rows[0]?.exists))
        .catch(() => false)
    );
  }
  return columnCache.get(key)!;
}

export function clearSchemaCaches() {
  tableCache.clear();
  columnCache.clear();
}
