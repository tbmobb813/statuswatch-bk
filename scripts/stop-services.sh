#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_NAME="statuswatch"

if command -v tmux >/dev/null 2>&1; then
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing tmux session $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
  fi
fi

# Kill any nohup-started pids if present
if [ -f logs/backend.pid ]; then
  PID=$(cat logs/backend.pid)
  echo "Killing backend pid $PID"
  kill "$PID" 2>/dev/null || true
  rm -f logs/backend.pid
fi

if [ -f logs/frontend.pid ]; then
  PID=$(cat logs/frontend.pid)
  echo "Killing frontend pid $PID"
  kill "$PID" 2>/dev/null || true
  rm -f logs/frontend.pid
fi

echo "Stopped services (tmux session removed and pid files cleaned)."
