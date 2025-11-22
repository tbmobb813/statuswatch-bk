#!/usr/bin/env bash
set -euo pipefail
# Collect and redact logs for safe sharing

OUTDIR=$(mktemp -d)
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
COLLECT_DIR="$OUTDIR/statuswatch-logs-$TIMESTAMP"
mkdir -p "$COLLECT_DIR/logs"

echo "Collecting logs into $COLLECT_DIR"

# Copy recent portions of logs to limit size (adjust lines as needed)
for f in logs/*.log; do
  if [ -f "$f" ]; then
    echo " - copying last 20000 lines of $f"
    tail -n 20000 "$f" > "$COLLECT_DIR/logs/$(basename "$f")"
  fi
done

# Copy other relevant small files if present (e.g., .env) and sanitize
if [ -f .env ]; then
  echo " - copying and redacting .env"
  # redact JWT_SECRET and DATABASE_URL values
  sed -E 's/^(JWT_SECRET=).*/\1REDACTED/' .env | sed -E 's/^(DATABASE_URL=).*/\1REDACTED/' > "$COLLECT_DIR/.env"
fi

# Generic redaction rules for collected files
echo "Applying redaction rules..."
find "$COLLECT_DIR" -type f | while read -r file; do
  # Replace IPv4 addresses, basic bearer tokens, long-looking tokens, and emails
  sed -E \
    -e 's/([0-9]{1,3}\.){3}[0-9]{1,3}/[REDACTED_IP]/g' \
    -e 's/(Bearer[[:space:]]+)[A-Za-z0-9._\-]{8,}/\1[REDACTED]/g' \
    -e 's/([A-Za-z0-9_\-]{20,})/[REDACTED_TOKEN]/g' \
    -e 's/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/[REDACTED_EMAIL]/g' \
    "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Create tarball in /tmp
OUTTAR="/tmp/statuswatch-collection-$TIMESTAMP.tgz"
tar -czf "$OUTTAR" -C "$OUTDIR" .

echo "Created $OUTTAR"
sha256sum "$OUTTAR" | awk '{print $1}' > "$OUTTAR.sha256"
echo "SHA256: $(cat "$OUTTAR.sha256")"

# Clean up
rm -rf "$OUTDIR"

echo "Done. You can attach $OUTTAR to issues or upload to storage."
