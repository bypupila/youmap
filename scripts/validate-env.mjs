#!/usr/bin/env node

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env.local");

const required = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "YOUTUBE_API_KEY",
  "GEMINI_API_KEY",
  "NOMINATIM_USER_AGENT",
  "NOMINATIM_EMAIL",
];

const requiredOneOf = [["AUTH_SESSION_SECRET", "SESSION_SECRET"]];

const optional = [
  "GEMINI_MODEL",
  "NEON_PROJECT_ID",
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_TRIAL_DISCOUNT_ID",
];

function parseEnv(content) {
  const out = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    out.set(key, value);
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const values = parseEnv(fs.readFileSync(envPath, "utf8"));
const missing = [];

for (const key of required) {
  if (!values.get(key)) missing.push(key);
}

for (const group of requiredOneOf) {
  const hasAny = group.some((key) => Boolean(values.get(key)));
  if (!hasAny) missing.push(`${group.join(" | ")}`);
}

if (missing.length > 0) {
  console.error("Missing required environment values:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Environment check passed.");
console.log("Optional values:");
for (const key of optional) {
  console.log(`- ${key}: ${values.get(key) ? "set" : "not set"}`);
}
