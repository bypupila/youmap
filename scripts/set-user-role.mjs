#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

const rootDir = process.cwd();

function loadDotEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { identifier: "", role: "" };
  for (const arg of args) {
    if (arg.startsWith("--identifier=")) out.identifier = arg.slice("--identifier=".length).trim();
    if (arg.startsWith("--role=")) out.role = arg.slice("--role=".length).trim();
  }
  return out;
}

async function main() {
  loadDotEnvLocal();
  const { identifier, role } = parseArgs();
  if (!identifier) {
    throw new Error("Missing --identifier=<email|username|uuid>");
  }
  if (!["viewer", "creator", "superadmin"].includes(role)) {
    throw new Error("Invalid --role. Use viewer | creator | superadmin");
  }

  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = neon(databaseUrl);
  const normalized = identifier.toLowerCase();
  const rows = await sql`
    update public.users
    set role = ${role}, updated_at = now()
    where id::text = ${identifier}
       or lower(email) = ${normalized}
       or lower(username) = ${normalized}
    returning id, email, username, role::text as role
  `;

  if (!rows[0]) {
    throw new Error("User not found");
  }

  console.log(JSON.stringify(rows[0], null, 2));
}

main().catch((error) => {
  console.error("[set-user-role]", error instanceof Error ? error.message : error);
  process.exit(1);
});
