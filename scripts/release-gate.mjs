#!/usr/bin/env node

import path from "path";
import { neon } from "@neondatabase/serverless";
import { loadDotEnvLocal, migrationName, rootDir, sortedSqlFiles } from "./lib/neon-sql.mjs";

function pass(id, detail) {
  return { id, status: "pass", detail };
}

function fail(id, detail) {
  return { id, status: "fail", detail };
}

async function tableExists(sql, tableName) {
  const rows = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    ) as exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  loadDotEnvLocal();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for release gate");
  }

  const sql = neon(databaseUrl);
  const checks = [];
  const requiredTables = [
    "users",
    "channels",
    "videos",
    "video_locations",
    "viewer_profiles",
    "user_consents",
    "creator_viewer_subscriptions",
    "viewer_video_activity",
    "schema_migrations",
  ];

  const tableResults = await Promise.all(requiredTables.map(async (name) => [name, await tableExists(sql, name)]));
  const missingTables = tableResults.filter(([, exists]) => !exists).map(([name]) => name);
  checks.push(
    missingTables.length === 0
      ? pass("db_required_tables", "Core, viewer attribution, activity, and migration tracking tables exist.")
      : fail("db_required_tables", `Missing tables: ${missingTables.join(", ")}`)
  );

  const migrationFiles = sortedSqlFiles(path.join(rootDir, "neon", "migrations"));
  const migrationNames = migrationFiles.map(migrationName);
  const appliedRows = await sql`
    select name
    from public.schema_migrations
    order by name
  `.catch(() => []);
  const appliedNames = new Set(appliedRows.map((row) => row.name));
  const pendingMigrations = migrationNames.filter((name) => !appliedNames.has(name));
  checks.push(
    pendingMigrations.length === 0
      ? pass("db_migrations", `${migrationNames.length} migrations tracked as applied.`)
      : fail("db_migrations", `Pending migrations: ${pendingMigrations.join(", ")}`)
  );

  const checkoutPlans = await sql`
    select slug,
           is_active,
           polar_product_id is not null as has_product,
           polar_price_id is not null as has_price
    from public.subscription_plans
    where slug in ('starter', 'pro', 'creator_plus')
    order by slug
  `.catch(() => []);
  const checkoutReady = checkoutPlans.filter((row) => row.is_active && row.has_product && row.has_price);
  checks.push(
    checkoutReady.length === 3
      ? pass("billing_polar_checkout", "starter, pro, and creator_plus have active Polar product and price IDs.")
      : fail("billing_polar_checkout", `Only ${checkoutReady.length}/3 launch checkout plans have Polar product and price IDs.`)
  );

  const polarAccessToken = String(process.env.POLAR_ACCESS_TOKEN || "").trim();
  const polarWebhookSecret = String(process.env.POLAR_WEBHOOK_SECRET || "").trim();
  checks.push(
    polarAccessToken && polarWebhookSecret
      ? pass("billing_polar_env", "POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET are configured.")
      : fail("billing_polar_env", "POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET are required before public launch.")
  );

  const noPaymentBypassEnabled = process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_NO_PAYMENT === "1";
  checks.push(
    noPaymentBypassEnabled
      ? fail("release_no_payment_bypass", "ENABLE_TEST_NO_PAYMENT cannot be enabled in production.")
      : pass("release_no_payment_bypass", "No-payment bypass is not enabled for production.")
  );

  const blockers = checks.filter((check) => check.status === "fail");
  const payload = {
    generated_at: new Date().toISOString(),
    ready: blockers.length === 0,
    blockers: blockers.length,
    checks,
  };
  console.log(JSON.stringify(payload, null, 2));
  if (blockers.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("[release-gate] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
