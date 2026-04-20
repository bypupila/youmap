#!/usr/bin/env node

import { execSync } from "child_process";

const patterns = [
  "polar_oat_",
  "polar_whs_",
  "AIza[0-9A-Za-z_-]{35}",
  "sk-[A-Za-z0-9]{20,}",
  "ghp_[A-Za-z0-9]{20,}",
  "postgres(?:ql)?://",
  "VERCEL_OIDC_TOKEN=",
];

function hasMatch(pattern) {
  try {
    execSync(`git rev-list --all | xargs -I{} git grep -n -E "${pattern}" {} --`, {
      stdio: "pipe",
      shell: "/bin/zsh",
    });
    return true;
  } catch (error) {
    return false;
  }
}

const findings = [];

for (const pattern of patterns) {
  if (hasMatch(pattern)) findings.push(pattern);
}

if (findings.length > 0) {
  console.error("Historical secret scan failed. Matched patterns:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Historical secret scan passed.");
