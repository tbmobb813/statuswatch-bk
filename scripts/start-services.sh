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
  # Ensure nothing is listening on the frontend default port (3000).
  echo "Ensuring port 3000 is free before starting frontend..."
  if command -v fuser >/dev/null 2>&1; then
    # fuser will kill processes using the port when -k is passed.
    fuser -k 3000/tcp 2>/dev/null || true
  else
    # Fallback: parse ss output for pids and terminate them gracefully.
    PIDS_TO_KILL=$(ss -ltnp sport = :3000 2>/dev/null | awk -F"pid=" '/pid=/{print $2}' | awk -F"," '{print $1}' | tr '\n' ' ')
    if [ -n "$PIDS_TO_KILL" ]; then
      echo "Killing processes listening on :3000 -> $PIDS_TO_KILL"
      kill -TERM $PIDS_TO_KILL 2>/dev/null || true
      sleep 1
    fi
  fi

  # If a session already exists, kill it to start fresh
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing existing tmux session $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
  fi

  echo "Starting backend and frontend inside tmux session: $SESSION_NAME"
  # Create session and first window for backend
  tmux new-session -d -s "$SESSION_NAME" -n backend "bash -lc './scripts/start-backend.sh >> logs/backend.log 2>&1'"
  # Create a window for the frontend and force it to use PORT=3000 so Next won't auto-fallback
  tmux new-window -t "$SESSION_NAME" -n frontend "bash -lc 'cd frontend && PORT=3000 npm run dev >> ../logs/frontend.log 2>&1'"

  echo "Started. Attach with: tmux attach -t $SESSION_NAME"
  exit 0
fi

echo "tmux not found — falling back to nohup."

# Start backend with nohup and write pid
nohup ./scripts/start-backend.sh >> logs/backend.log 2>&1 &
echo $! > logs/backend.pid
echo "Backend started (pid $(cat logs/backend.pid)), logging to logs/backend.log"

# Start frontend in background
(
  # Before starting, ensure port 3000 is free in nohup mode as well
  echo "Ensuring port 3000 is free before starting frontend (nohup fallback)..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp 2>/dev/null || true
  else
    PIDS_TO_KILL=$(ss -ltnp sport = :3000 2>/dev/null | awk -F"pid=" '/pid=/{print $2}' | awk -F"," '{print $1}' | tr '\n' ' ')
    if [ -n "$PIDS_TO_KILL" ]; then
      echo "Killing processes listening on :3000 -> $PIDS_TO_KILL"
      kill -TERM $PIDS_TO_KILL 2>/dev/null || true
      sleep 1
    fi
  fi
  cd frontend && nohup env PORT=3000 npm run dev >> ../logs/frontend.log 2>&1 & echo $! > ../logs/frontend.pid
)
echo "Frontend started (pid $(cat logs/frontend.pid)), logging to logs/frontend.log"

echo "To stop (nohup mode): kill \\$(cat logs/backend.pid) \\$(cat logs/frontend.pid)"
