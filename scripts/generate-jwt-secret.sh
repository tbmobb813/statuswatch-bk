#!/usr/bin/env bash
set -euo pipefail

# Generate a high-entropy JWT secret and write it to .env (development)
# The secret is NOT printed to stdout for safety.

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE not found. Creating a new one."
  touch "$ENV_FILE"
fi

# Generate 32 bytes (64 hex chars)
SECRET=$(openssl rand -hex 32)

# If JWT_SECRET exists, replace it; otherwise append
if grep -q '^JWT_SECRET=' "$ENV_FILE"; then
  # Use double quotes so the secret is quoted in the file
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=\"${SECRET}\"/" "$ENV_FILE"
else
  echo "JWT_SECRET=\"${SECRET}\"" >> "$ENV_FILE"
fi

# Ensure file permissions are restrictive
chmod 600 "$ENV_FILE" || true

echo "Wrote new JWT_SECRET to $ENV_FILE (value not displayed)."
