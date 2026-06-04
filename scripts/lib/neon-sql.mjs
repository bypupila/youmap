import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..", "..");

export function loadDotEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const rawValue = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !(key in process.env)) {
      process.env[key] = rawValue;
    }
  }
}

export function sortedSqlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => path.join(dirPath, name));
}

export function splitSqlStatements(source) {
  const statements = [];
  let current = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += "/";
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }

    if (dollarTag) {
      if (source.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    if (inSingle) {
      current += char;
      if (char === "'" && next === "'") {
        current += "'";
        i += 2;
        continue;
      }
      if (char === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (inDouble) {
      current += char;
      if (char === '"' && next === '"') {
        current += '"';
        i += 2;
        continue;
      }
      if (char === '"') inDouble = false;
      i += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      current += "--";
      i += 2;
      inLineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      current += "/*";
      i += 2;
      inBlockComment = true;
      continue;
    }

    if (char === "'") {
      current += char;
      inSingle = true;
      i += 1;
      continue;
    }

    if (char === '"') {
      current += char;
      inDouble = true;
      i += 1;
      continue;
    }

    if (char === "$") {
      const remainder = source.slice(i);
      const match = remainder.match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (char === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

export function readSqlFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return {
    raw,
    statements: raw.trim() ? splitSqlStatements(raw) : [],
    checksum: crypto.createHash("sha256").update(raw).digest("hex"),
  };
}

export function migrationName(filePath) {
  return path.basename(filePath);
}

export async function runSqlFile(sql, filePath) {
  const { statements } = readSqlFile(filePath);
  if (statements.length === 0) return { statements: 0 };
  process.stdout.write(`Applying ${path.relative(rootDir, filePath)} ... `);
  for (const statement of statements) {
    await sql.query(statement);
  }
  process.stdout.write("ok\n");
  return { statements: statements.length };
}

export async function ensureSchemaMigrations(sql) {
  await sql`
    create table if not exists public.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;
}

export async function schemaMigrationsTableExists(sql) {
  const rows = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'schema_migrations'
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

export async function loadAppliedMigrations(sql, options = {}) {
  const ensure = options.ensure !== false;
  if (ensure) {
    await ensureSchemaMigrations(sql);
  } else {
    const exists = await schemaMigrationsTableExists(sql);
    if (!exists) return new Map();
  }

  const rows = await sql`
    select name, checksum, applied_at
    from public.schema_migrations
    order by name
  `;
  return new Map(rows.map((row) => [row.name, row]));
}

export async function recordMigration(sql, filePath) {
  await ensureSchemaMigrations(sql);
  const name = migrationName(filePath);
  const { checksum } = readSqlFile(filePath);
  await sql`
    insert into public.schema_migrations (name, checksum)
    values (${name}, ${checksum})
    on conflict (name) do update
    set checksum = excluded.checksum,
        applied_at = public.schema_migrations.applied_at
  `;
}

export function selectMigrationFiles(files, selectors) {
  if (selectors.length === 0) return files;
  const selected = selectors.map((selector) => {
    const exact = files.find((filePath) => migrationName(filePath) === selector);
    if (exact) return exact;

    const withExtension = selector.endsWith(".sql") ? selector : `${selector}.sql`;
    const byExtension = files.find((filePath) => migrationName(filePath) === withExtension);
    if (byExtension) return byExtension;

    const byPrefix = files.filter((filePath) => migrationName(filePath).startsWith(selector));
    if (byPrefix.length === 1) return byPrefix[0];
    if (byPrefix.length > 1) {
      throw new Error(`Migration selector "${selector}" matches multiple files: ${byPrefix.map(migrationName).join(", ")}`);
    }
    throw new Error(`Migration selector "${selector}" did not match any file`);
  });

  return [...new Set(selected)].sort((a, b) => migrationName(a).localeCompare(migrationName(b), "en"));
}
