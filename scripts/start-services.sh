#!/usr/bin/env bash
set -euo pipefail

# Start both backend and frontend in a resilient way.
# Prefer tmux if available (creates a detached session with two windows).
# Fallback to nohup+pid files if tmux isn't installed.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p logs

SESSION_NAME="statuswatch"

if command -v tmux >/dev/null 2>&1; then
  # If a session already exists, kill it to start fresh
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing existing tmux session $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
  fi

  echo "Starting backend and frontend inside tmux session: $SESSION_NAME"
  # Create session and first window for backend
  tmux new-session -d -s "$SESSION_NAME" -n backend "bash -lc './scripts/start-backend.sh >> logs/backend.log 2>&1'"
  # Create a window for the frontend
  tmux new-window -t "$SESSION_NAME" -n frontend "bash -lc 'cd frontend && npm run dev >> ../logs/frontend.log 2>&1'"

  echo "Started. Attach with: tmux attach -t $SESSION_NAME"
  exit 0
fi

echo "tmux not found — falling back to nohup."

# Start backend with nohup and write pid
nohup ./scripts/start-backend.sh >> logs/backend.log 2>&1 &
echo $! > logs/backend.pid
echo "Backend started (pid $(cat logs/backend.pid)), logging to logs/backend.log"

# Start frontend in background
(cd frontend && nohup npm run dev >> ../logs/frontend.log 2>&1 & echo $! > ../logs/frontend.pid)
echo "Frontend started (pid $(cat logs/frontend.pid)), logging to logs/frontend.log"

echo "To stop (nohup mode): kill \\$(cat logs/backend.pid) \\$(cat logs/frontend.pid)"
