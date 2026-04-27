#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
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

function sortedSqlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => path.join(dirPath, name));
}

function splitSqlStatements(source) {
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

async function runSqlFile(sql, filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return;
  process.stdout.write(`Applying ${path.relative(rootDir, filePath)} ... `);
  const statements = splitSqlStatements(raw);
  for (const statement of statements) {
    await sql.query(statement);
  }
  process.stdout.write("ok\n");
}

async function main() {
  loadDotEnvLocal();
  const databaseUrl = String(
    process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.NEON_POSTGRES_URL ||
      ""
  ).trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (or NEON_DATABASE_URL / POSTGRES_URL / NEON_POSTGRES_URL) is required."
    );
  }

  const sql = neon(databaseUrl);
  const migrationFiles = sortedSqlFiles(path.join(rootDir, "neon", "migrations"));
  for (const filePath of migrationFiles) {
    await runSqlFile(sql, filePath);
  }

  const seedFiles = sortedSqlFiles(path.join(rootDir, "neon", "seed"));
  for (const filePath of seedFiles) {
    await runSqlFile(sql, filePath);
  }

  console.log("Neon bootstrap complete.");
}

main().catch((error) => {
  console.error("[bootstrap-neon] failed");
  console.error(error);
  process.exit(1);
});
