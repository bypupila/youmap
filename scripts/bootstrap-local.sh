#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "TravelMap local bootstrap"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is not installed."
  echo "Install it, then run:"
  echo "  supabase db push --db-url <DATABASE_URL>"
  echo "  supabase db seed --db-url <DATABASE_URL>"
  exit 1
fi

if [[ -f .env.local ]]; then
  echo "Found .env.local"
else
  echo "No .env.local found. Create one from .env.example before continuing."
fi

echo "Applying Supabase migrations and seed to the linked project or local database..."
supabase db push
supabase db seed

echo "Done."
