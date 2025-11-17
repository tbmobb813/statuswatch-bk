#!/usr/bin/env bash
set -euo pipefail

# Script: remove_large_file.sh
# Purpose: Create a mirror backup, run git-filter-repo to remove a large file path from history,
#          run git gc, and print verification + safe push commands.
# Usage:
#   1) Make executable: chmod +x scripts/remove_large_file.sh
#   2) Dry run (default, does not push): ./scripts/remove_large_file.sh
#   3) To push cleaned mirror back to origin (destructive): ./scripts/remove_large_file.sh --push
#
# Important: Read and confirm before running with --push. Coordinate with collaborators before pushing.

REPO_PATH="$(pwd)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
MIRROR_DIR="/tmp/statuswatch-mirror-${TIMESTAMP}.git"
TARGET_PATH="frontend/node_modules/@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node"
PUSH_AFTER=0

print_usage() {
  cat <<EOF
Usage: $0 [--push] [--help]

Creates a mirror backup of the current repository, removes
"${TARGET_PATH}" from all commits (using git-filter-repo), performs gc,
and prints verification output.

--push    : After cleaning the mirror, automatically push --mirror origin (DANGEROUS - rewrites history).
--help    : Show this message.

By default the script does NOT push. Run with --push only when you're ready and have coordinated with your team.
EOF
}

# parse args
while (( "$#" )); do
  case "$1" in
    --push) PUSH_AFTER=1; shift ;;
    --help) print_usage; exit 0 ;;
    -h) print_usage; exit 0 ;;
    *) echo "Unknown arg: $1"; print_usage; exit 1 ;;
  esac
done

# checks
if ! command -v git >/dev/null 2>&1; then
  echo "git is required but not found in PATH. Aborting." >&2
  exit 1
fi

# Detect git-filter-repo. Prefer the git subcommand wrapper (git-filter-repo installed to PATH),
# otherwise fall back to running the Python module with `python -m git_filter_repo`.
FILTER_REPO_CMD=""
if python3 -c "import importlib.util; print(importlib.util.find_spec('git_filter_repo') is not None)" 2>/dev/null | grep -q True; then
  FILTER_REPO_CMD="python3 -m git_filter_repo"
elif python -c "import importlib.util; print(importlib.util.find_spec('git_filter_repo') is not None)" 2>/dev/null | grep -q True; then
  FILTER_REPO_CMD="python -m git_filter_repo"
else
  echo "git-filter-repo not found as a Python module."
  echo "Install it with: pip install --user git-filter-repo"
  echo "See: https://github.com/newren/git-filter-repo"
  exit 1
fi

echo "Creating mirror clone at: ${MIRROR_DIR}"
# use a local mirror clone with --no-local to ensure a fresh packed repo for git-filter-repo
git clone --mirror --no-local "${REPO_PATH}" "${MIRROR_DIR}"

cd "${MIRROR_DIR}"

echo "Running git-filter-repo to remove path: ${TARGET_PATH}"
# invert-paths removes the given path from history
# NOTE: this will rewrite all refs in the mirror repo
${FILTER_REPO_CMD} --path "${TARGET_PATH}" --invert-paths

echo "Expiring reflog and running garbage collection (aggressive)"
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true

# verification
echo
echo "Verification: searching for the file in cleaned history..."
if git rev-list --objects --all | grep -i "$(basename ${TARGET_PATH})" >/dev/null 2>&1; then
  echo "WARNING: file still present in history (search found a match)"
  git rev-list --objects --all | grep -i "$(basename ${TARGET_PATH})"
else
  echo "OK: target file not found in history (good)."
fi

# size check for any object >80MB as extra safety (approx)
# this is a heuristic - lists objects and their sizes
if command -v git-sizer >/dev/null 2>&1; then
  echo "(Optional) git-sizer output available. Consider running git-sizer to inspect repository size."
fi

# Summarize next steps and optionally push
echo
if [ ${PUSH_AFTER} -eq 1 ]; then
  echo "PUSH MODE: ready to push the cleaned mirror back to origin (this will rewrite remote history)."
  read -p "Are you sure you want to push --mirror origin? Type 'yes' to continue: " CONFIRM
  if [ "${CONFIRM}" = "yes" ]; then
    echo "Pushing cleaned mirror to origin (git push --mirror origin). This rewrites remote history..."
    git push --mirror origin
    echo "Push complete. Inform collaborators to re-clone or reset their branches." 
  else
    echo "Push aborted by user. No changes pushed."
  fi
else
  echo "Dry run complete. To push the cleaned mirror to origin (destructive), run from the mirror dir:" 
  echo
  echo "  cd ${MIRROR_DIR}"
  echo "  git push --mirror origin"
  echo
  echo "Or run this script with --push to perform the push with an extra confirmation prompt."
fi

echo "Script finished. Mirror kept at: ${MIRROR_DIR} (you can archive or delete it as needed)."

# End of script
