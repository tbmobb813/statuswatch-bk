#!/usr/bin/env bash
# Start the backend by exporting variables from .env into the environment and running tsx.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [ -f .env ]; then
  # Export environment variables from .env safely (ignore comments and empty lines)
  set -a
  # shellcheck disable=SC1091
  . .env || true
  set +a
fi

# Run tsx directly via npx so we don't rely on any global binaries.
npx tsx src/server.ts
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . .env || true
  set +a
fi

# Run tsx directly via npx so we don't rely on any global binaries.
exec npx tsx src/server.ts
