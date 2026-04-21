#!/usr/bin/env node

import fs from "fs";
import path from "path";

const WORKFLOWS_DIR = path.resolve(process.cwd(), ".github", "workflows");
const SHA_PATTERN = /^[a-f0-9]{40}$/i;

if (!fs.existsSync(WORKFLOWS_DIR)) {
  console.log("No workflow directory found. Workflow pinning check skipped.");
  process.exit(0);
}

const workflowFiles = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => path.join(WORKFLOWS_DIR, name));

const findings = [];

for (const filePath of workflowFiles) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s*uses:\s*([^\s#]+)\s*$/);
    if (!match) continue;

    const reference = match[1].trim();
    if (reference.startsWith("./") || reference.startsWith("docker://")) continue;

    const atIndex = reference.lastIndexOf("@");
    if (atIndex === -1) {
      findings.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        reason: `Action reference missing version: ${reference}`,
      });
      continue;
    }

    const version = reference.slice(atIndex + 1);
    if (!SHA_PATTERN.test(version)) {
      findings.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        reason: `Action must be pinned to a full commit SHA: ${reference}`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Workflow pinning check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} -> ${finding.reason}`);
  }
  process.exit(1);
}

console.log(`Workflow pinning check passed for ${workflowFiles.length} workflow file(s).`);
