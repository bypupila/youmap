#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";

const envPath = path.resolve(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
const nextSecret = crypto.randomBytes(32).toString("hex");

let replaced = false;
const updated = lines.map((line) => {
  if (!line.startsWith("AUTH_SESSION_SECRET=")) return line;
  replaced = true;
  return `AUTH_SESSION_SECRET=${nextSecret}`;
});

if (!replaced) updated.push(`AUTH_SESSION_SECRET=${nextSecret}`);

fs.writeFileSync(envPath, `${updated.join("\n").replace(/\n+$/, "\n")}`);
console.log("AUTH_SESSION_SECRET rotated in .env.local");
