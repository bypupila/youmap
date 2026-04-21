#!/usr/bin/env node

import fs from "fs";
import path from "path";

const LOCKFILE_PATH = path.resolve(process.cwd(), "package-lock.json");
const MIN_AGE_HOURS = Number.parseInt(process.env.MIN_PACKAGE_RELEASE_AGE_HOURS || "72", 10);
const REGISTRY_BASE = process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";

if (!Number.isFinite(MIN_AGE_HOURS) || MIN_AGE_HOURS < 1) {
  console.error("MIN_PACKAGE_RELEASE_AGE_HOURS must be a positive integer.");
  process.exit(1);
}

if (!fs.existsSync(LOCKFILE_PATH)) {
  console.error("package-lock.json is required for release age validation.");
  process.exit(1);
}

const lockfile = JSON.parse(fs.readFileSync(LOCKFILE_PATH, "utf8"));
const packages = lockfile.packages || {};
const packageMap = new Map();

function packageNameFromLockPath(packagePath) {
  const parts = packagePath.split("/").filter(Boolean);
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  const relevant = nodeModulesIndex === -1 ? parts : parts.slice(nodeModulesIndex + 1);
  if (!relevant.length) return null;
  if (relevant[0].startsWith("@") && relevant.length >= 2) {
    return `${relevant[0]}/${relevant[1]}`;
  }
  return relevant[0];
}

for (const [packagePath, meta] of Object.entries(packages)) {
  if (!packagePath || !meta || typeof meta !== "object") continue;
  if (!packagePath.startsWith("node_modules/")) continue;

  const version = typeof meta.version === "string" ? meta.version.trim() : "";
  const resolved = typeof meta.resolved === "string" ? meta.resolved.trim() : "";
  if (!version || !resolved || resolved.startsWith("file:") || resolved.startsWith("git+")) continue;

  const name =
    (typeof meta.name === "string" && meta.name.trim()) ||
    packageNameFromLockPath(packagePath);
  if (!name) continue;
  const key = `${name}@${version}`;
  packageMap.set(key, {
    name,
    version,
  });
}

const packagesToCheck = Array.from(packageMap.values());

async function fetchPackageDocument(name) {
  const response = await fetch(`${REGISTRY_BASE}/${encodeURIComponent(name)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Registry metadata request failed for ${name}: ${response.status}`);
  }

  return response.json();
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await worker(items[current], current);
      }
    })
  );

  return results;
}

const now = Date.now();
const violations = [];

await mapWithConcurrency(packagesToCheck, 8, async (pkg) => {
  const doc = await fetchPackageDocument(pkg.name);
  const releaseAtRaw = doc?.time?.[pkg.version];
  if (!releaseAtRaw) {
    violations.push({
      name: pkg.name,
      version: pkg.version,
      ageHours: null,
      reason: "publish time unavailable",
    });
    return;
  }

  const releaseAtMs = new Date(releaseAtRaw).getTime();
  if (!Number.isFinite(releaseAtMs)) {
    violations.push({
      name: pkg.name,
      version: pkg.version,
      ageHours: null,
      reason: `invalid publish time: ${releaseAtRaw}`,
    });
    return;
  }

  const ageHours = (now - releaseAtMs) / (1000 * 60 * 60);
  if (ageHours < MIN_AGE_HOURS) {
    violations.push({
      name: pkg.name,
      version: pkg.version,
      ageHours,
      reason: `published ${ageHours.toFixed(1)} hours ago`,
    });
  }
});

if (violations.length > 0) {
  console.error(`Package release age policy failed. Minimum age: ${MIN_AGE_HOURS} hours.`);
  for (const violation of violations.sort((left, right) => {
    const leftAge = left.ageHours ?? Number.POSITIVE_INFINITY;
    const rightAge = right.ageHours ?? Number.POSITIVE_INFINITY;
    return leftAge - rightAge;
  })) {
    console.error(`- ${violation.name}@${violation.version}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log(`Package release age policy passed. Checked ${packagesToCheck.length} locked packages with a ${MIN_AGE_HOURS}h minimum age.`);
