#!/usr/bin/env bash
set -euo pipefail

# scripts/check-env.sh
# Check that a Prisma-compatible DATABASE_URL is available.
# It will try to source .env and .env.local if the env var is missing.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

ENV_FILES=(".env" ".env.local")

try_source_env_files() {
  for f in "${ENV_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      echo "Loading env from $f"
      # shellcheck disable=SC1090
      set -a
      . "$f"
      set +a
      return 0
    fi
  done
  return 1
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set in the environment. Trying to source .env / .env.local..."
  try_source_env_files || true
fi
#!/usr/bin/env bash
set -euo pipefail

# scripts/check-env.sh
# Check that a Prisma-compatible DATABASE_URL is available.
# It will try to source .env.local then .env if the env var is missing.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

ENV_FILES=(".env.local" ".env")

try_source_env_files() {
  for f in "${ENV_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      echo "Loading env from $f"
      # shellcheck disable=SC1090
      set -a
      . "$f"
      set +a
      return 0
    fi
  done
  return 1
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set in the environment. Trying to source .env.local / .env..."
  try_source_env_files || true
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  cat <<'EOF'
Error: DATABASE_URL was not found in your current environment.

Tips:
- Copy `.env.example` to `.env` and configure `DATABASE_URL`. For example:
    cp .env.example .env

- If you prefer keeping values in Next.js `.env.local`, either copy it to `.env` or use
  the helper npm scripts that load `.env.local` for Prisma (see README).

See the README for more details.
EOF
  exit 2
fi

URL="$DATABASE_URL"

# Determine provider from prisma/schema.prisma (inside the datasource block)
SCHEMA_FILE="prisma/schema.prisma"
PRISMA_PROVIDER=""
if [[ -f "$SCHEMA_FILE" ]]; then
  PRISMA_PROVIDER=$(sed -n '/datasource .*{/,/}/p' "$SCHEMA_FILE" | grep -E 'provider\s*=\s*"[^"]+"' | sed -E 's/.*"([^"]+)".*/\1/' | head -n1) || true
fi

warn_provider_mismatch() {
  local provider=$1
  local url=$2
  local ok=0
  case "$provider" in
    postgresql)
      if [[ "$url" =~ ^(postgres(ql)?:) ]]; then ok=1; fi
      ;;
    sqlite)
      if [[ "$url" =~ ^file: ]]; then ok=1; fi
      ;;
    mysql)
      if [[ "$url" =~ ^mysql: ]]; then ok=1; fi
      ;;
    sqlserver)
      if [[ "$url" =~ ^sqlserver: ]]; then ok=1; fi
      ;;
    *)
      ok=1
      ;;
  esac

  if [[ $ok -ne 1 ]]; then
    echo "Warning: Prisma provider in prisma/schema.prisma is '$provider' but DATABASE_URL looks like '$url'."
    echo "Make sure you configured the correct provider in prisma/schema.prisma or set a matching DATABASE_URL."
  fi
}

if [[ -n "$PRISMA_PROVIDER" ]]; then
  warn_provider_mismatch "$PRISMA_PROVIDER" "$URL"
fi

# Basic sanity checks for DATABASE_URL
if [[ "$DATABASE_URL" == *"..."* || "$DATABASE_URL" == *"<"* || "$DATABASE_URL" == "postgresql://" || "$DATABASE_URL" == "" ]]; then
  echo "Warning: DATABASE_URL looks like a placeholder. Make sure you set the actual credentials in .env or .env.local."
fi

echo "DATABASE_URL OK (using provider: ${PRISMA_PROVIDER:-unknown})."
exit 0
  cd "$ROOT_DIR" || exit 1
