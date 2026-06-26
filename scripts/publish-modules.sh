#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# QueueLess — per-module branch publisher
#
# Goal: keep ONE source of truth (main) but be able to push each module on its
# own branch, so "push backend" ships only backend, "push frontend" ships only
# frontend, etc. This uses `git subtree split`, which rewrites a single
# directory's history into a standalone branch containing ONLY that directory.
#
#   Module dir   ->  Branch
#   frontend/    ->  frontend
#   backend/     ->  backend
#   firebase/    ->  database
#   analytics/   ->  analytics
#
# This script is LOCAL-ONLY. It updates the local module branches from main.
# It NEVER pushes. After running it, review the branches, then push the one(s)
# you want yourself, e.g.:
#
#   git push origin backend
#   git push origin frontend
#
# Usage:
#   bash scripts/publish-modules.sh            # split every module
#   bash scripts/publish-modules.sh backend    # split just one module
# ---------------------------------------------------------------------------
set -euo pipefail

# Map: <branch>:<directory>
MODULES=(
  "frontend:frontend"
  "backend:backend"
  "database:firebase"
  "analytics:analytics"
)

split_one() {
  local branch="$1" dir="$2"
  if [ ! -d "$dir" ]; then
    echo "  ! skipping '$branch' — directory '$dir/' not found"
    return
  fi
  echo "==> $dir/  ->  branch '$branch'"
  # -b creates/overwrites the local branch with a tree containing only $dir.
  git branch -D "$branch" >/dev/null 2>&1 || true
  git subtree split --prefix="$dir" -b "$branch"
  echo "    done. Push with:  git push origin $branch"
}

# Must be on main (or pass --force-current to allow any branch).
current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "main" ] && [ "${2:-}" != "--force-current" ]; then
  echo "Refusing to run: you are on '$current', not 'main'."
  echo "Run from main, or append --force-current if you know what you're doing."
  exit 1
fi

if [ $# -ge 1 ] && [ "$1" != "--force-current" ]; then
  target="$1"
  for m in "${MODULES[@]}"; do
    b="${m%%:*}"; d="${m##*:}"
    [ "$b" = "$target" ] && split_one "$b" "$d" && exit 0
  done
  echo "Unknown module '$target'. Valid: frontend backend database analytics"
  exit 1
fi

for m in "${MODULES[@]}"; do
  split_one "${m%%:*}" "${m##*:}"
done

echo
echo "All module branches updated locally from main. Nothing was pushed."
echo "Push the module(s) you want, e.g.:  git push origin backend"
