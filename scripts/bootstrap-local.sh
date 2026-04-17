#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "TravelMap local bootstrap"

if [[ -f .env.local ]]; then
  echo "Found .env.local"
else
  echo "No .env.local found. Create one from .env.example before continuing."
  exit 1
fi

echo "Applying Neon migrations and seed to DATABASE_URL..."
node ./scripts/bootstrap-neon.mjs

echo "Done."
