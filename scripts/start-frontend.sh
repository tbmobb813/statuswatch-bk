#!/usr/bin/env bash
set -euo pipefail
# Ensure logs directory exists
mkdir -p "$(dirname "$0")/../logs" || true
cd "$(dirname "$0")/.."
echo "Starting frontend (logs -> logs/frontend.log)"
# Start Next dev inside the frontend directory and append logs
cd frontend
npm run dev >> ../logs/frontend.log 2>&1
