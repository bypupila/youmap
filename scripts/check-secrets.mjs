#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const trackedFiles = execSync("git ls-files -z", { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const blockedEnvFiles = trackedFiles.filter((file) => /^\.env(\..+)?$/.test(file) && file !== ".env.example");

const suspiciousPatterns = [
  { name: "Google API key", regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "OpenAI key", regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: "GitHub token", regex: /ghp_[A-Za-z0-9]{20,}/g },
  { name: "Polar access token", regex: /polar_oat_[A-Za-z0-9._-]{20,}/g },
  { name: "Polar webhook secret", regex: /polar_whs_[A-Za-z0-9._-]{20,}/g },
  { name: "Database URL", regex: /postgres(?:ql)?:\/\/[^\s"']+/g },
  { name: "JWT/OIDC token", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
];

const sensitiveEnvKeys = new Set([
  "DATABASE_URL",
  "AUTH_SESSION_SECRET",
  "SESSION_SECRET",
  "YOUTUBE_API_KEY",
  "GOOGLE_GENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "NEON_API_KEY",
  "VERCEL_OIDC_TOKEN",
]);

function normalizeValue(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function isPlaceholder(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return true;
  if (normalized.startsWith("${") && normalized.endsWith("}")) return true;

  const lower = normalized.toLowerCase();
  const placeholderHints = [
    "your_",
    "replace-with",
    "set_new_rotated",
    "changeme",
    "example",
    "localhost",
    "user:password@host",
    "polar_...",
    "whsec_...",
    "dummy",
    "test",
  ];

  if (normalized.startsWith("<") && normalized.endsWith(">")) return true;
  return placeholderHints.some((hint) => lower.includes(hint));
}

function isTextFile(content) {
  return !content.includes("\u0000");
}

const findings = [];

for (const file of blockedEnvFiles) {
  findings.push({
    file,
    line: 1,
    reason: "Tracked .env file detected (only .env.example can be committed).",
  });
}

for (const file of trackedFiles) {
  if (file === ".env.example") continue;

  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) continue;

  const stat = fs.statSync(absolute);
  if (stat.size > 1024 * 1024) continue;

  const raw = fs.readFileSync(absolute, "utf8");
  if (!isTextFile(raw)) continue;

  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const envMatch = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (envMatch) {
      const key = envMatch[1];
      const value = envMatch[2] ?? "";
      if (sensitiveEnvKeys.has(key) && !isPlaceholder(value)) {
        findings.push({
          file,
          line: i + 1,
          reason: `Sensitive env key with non-placeholder value: ${key}`,
        });
      }
    }

    for (const pattern of suspiciousPatterns) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(line)) continue;
      if (isPlaceholder(line)) continue;
      findings.push({
        file,
        line: i + 1,
        reason: `Suspicious secret pattern: ${pattern.name}`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Potential leaks found:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} -> ${finding.reason}`);
  }
  process.exit(1);
}

console.log("Secret scan passed. No tracked secrets detected.");
