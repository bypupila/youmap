#!/usr/bin/env node

import path from "path";
import { neon } from "@neondatabase/serverless";
import {
  ensureSchemaMigrations,
  loadAppliedMigrations,
  loadDotEnvLocal,
  migrationName,
  readSqlFile,
  recordMigration,
  rootDir,
  runSqlFile,
  selectMigrationFiles,
  sortedSqlFiles,
} from "./lib/neon-sql.mjs";

function parseArgs(argv) {
  const options = {
    dryRun: false,
    status: false,
    only: [],
    baselineThrough: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--status") {
      options.status = true;
      continue;
    }
    if (arg.startsWith("--only=")) {
      const value = arg.slice("--only=".length).trim();
      if (!value) throw new Error("--only requires a migration selector");
      options.only.push(value);
      continue;
    }
    if (arg.startsWith("--baseline-through=")) {
      const value = arg.slice("--baseline-through=".length).trim();
      if (!value) throw new Error("--baseline-through requires a migration selector");
      options.baselineThrough = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log(`Usage:
  npm run db:migrations:status
  npm run db:migrate -- --dry-run
  npm run db:migrate -- --only=0016
  npm run db:migrate -- --baseline-through=0015 --only=0016

Options:
  --status                 Print tracked migration status and exit.
  --dry-run                Print what would run without executing SQL.
  --only=<selector>        Apply one migration by filename or unique prefix. Repeatable.
  --baseline-through=<s>   Mark migrations through selector as already applied without executing them.
`);
}

function describeMigration(filePath) {
  const { statements, checksum } = readSqlFile(filePath);
  return {
    name: migrationName(filePath),
    statements: statements.length,
    checksum: checksum.slice(0, 12),
  };
}

async function printStatus({ sql, migrationFiles }) {
  const applied = await loadAppliedMigrations(sql, { ensure: false });
  for (const filePath of migrationFiles) {
    const descriptor = describeMigration(filePath);
    const row = applied.get(descriptor.name);
    const status = row ? "applied" : "pending";
    const checksumStatus = row && row.checksum !== readSqlFile(filePath).checksum ? " checksum-mismatch" : "";
    console.log(`${status.padEnd(8)} ${descriptor.name} statements=${descriptor.statements} checksum=${descriptor.checksum}${checksumStatus}`);
  }
}

function baselineFilesThrough(migrationFiles, selector) {
  const [target] = selectMigrationFiles(migrationFiles, [selector]);
  const targetName = migrationName(target);
  return migrationFiles.filter((filePath) => migrationName(filePath).localeCompare(targetName, "en") <= 0);
}

async function baselineExisting({ sql, migrationFiles, selector, dryRun }) {
  const files = baselineFilesThrough(migrationFiles, selector);
  if (files.length === 0) throw new Error(`No migrations selected for baseline-through=${selector}`);

  if (dryRun) {
    for (const filePath of files) {
      console.log(`baseline ${migrationName(filePath)}`);
    }
    return;
  }

  await ensureSchemaMigrations(sql);
  for (const filePath of files) {
    await recordMigration(sql, filePath);
    console.log(`baseline ${migrationName(filePath)} ok`);
  }
}

function assertSafePlan({ applied, hasOnly }) {
  if (hasOnly) return;
  if (applied.size > 0) return;

  throw new Error(
    "Refusing to infer migration history from an untracked database. Use --only=<migration> for a targeted patch or --baseline-through=<migration> after verifying the existing schema."
  );
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const options = parseArgs(process.argv.slice(2));

  loadDotEnvLocal();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required in .env.local or environment");
  }

  const sql = neon(databaseUrl);
  const migrationFiles = sortedSqlFiles(path.join(rootDir, "neon", "migrations"));
  if (migrationFiles.length === 0) throw new Error("No migration files found");

  if (options.status) {
    await printStatus({ sql, migrationFiles });
    return;
  }

  if (options.baselineThrough) {
    await baselineExisting({
      sql,
      migrationFiles,
      selector: options.baselineThrough,
      dryRun: options.dryRun,
    });
  }

  const applied = await loadAppliedMigrations(sql, { ensure: false });
  const selectedFiles =
    options.only.length > 0
      ? selectMigrationFiles(migrationFiles, options.only)
      : migrationFiles.filter((filePath) => !applied.has(migrationName(filePath)));

  assertSafePlan({
    applied,
    hasOnly: options.only.length > 0,
  });

  if (selectedFiles.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const filePath of selectedFiles) {
    const name = migrationName(filePath);
    if (applied.has(name) && options.only.length === 0) continue;
    const descriptor = describeMigration(filePath);
    if (options.dryRun) {
      console.log(`apply ${descriptor.name} statements=${descriptor.statements} checksum=${descriptor.checksum}`);
      continue;
    }

    await runSqlFile(sql, filePath);
    await recordMigration(sql, filePath);
  }

  console.log("Neon migrations complete.");
}

main().catch((error) => {
  console.error("[db-migrate] failed");
  console.error(error instanceof Error ? error.message : error);
  printUsage();
  process.exit(1);
});
