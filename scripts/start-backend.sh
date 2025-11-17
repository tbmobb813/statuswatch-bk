#!/usr/bin/env bash
set -euo pipefail
# Ensure logs directory exists
mkdir -p "$(dirname "$0")/../logs" || true
cd "$(dirname "$0")/.."
# Start backend with dotenv and tsx, append stdout/stderr to logs/backend.log
echo "Starting backend (logs -> logs/backend.log)"
dotenv -e .env -- npx tsx src/server.ts >> logs/backend.log 2>&1
