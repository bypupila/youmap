#!/usr/bin/env node
import path from "path";
import { neon } from "@neondatabase/serverless";
import { loadDotEnvLocal, recordMigration, rootDir, runSqlFile, sortedSqlFiles } from "./lib/neon-sql.mjs";

async function main() {
  loadDotEnvLocal();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required in .env.local");
  }

  const sql = neon(databaseUrl);
  const migrationFiles = sortedSqlFiles(path.join(rootDir, "neon", "migrations"));
  for (const filePath of migrationFiles) {
    await runSqlFile(sql, filePath);
    await recordMigration(sql, filePath);
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
