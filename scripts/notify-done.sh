#!/usr/bin/env bash
set -euo pipefail

TITLE="${1:-Codex}"
MESSAGE="${2:-Tarea finalizada}"

osascript -e "display notification \"${MESSAGE//\"/\\\"}\" with title \"${TITLE//\"/\\\"}\""
