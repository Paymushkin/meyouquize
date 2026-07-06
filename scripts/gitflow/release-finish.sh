#!/usr/bin/env bash
# Завершить релиз: release → main (tag vX.Y.Z) → develop.
# usage: bash scripts/gitflow/release-finish.sh 0.2.0
set -euo pipefail

VERSION="${1:?usage: $0 <semver>  e.g. 0.2.0}"
BRANCH="release/${VERSION}"
TAG="v${VERSION}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT"
git fetch origin

if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "branch $BRANCH not found — run release-start first" >&2
  exit 1
fi

git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH" 2>/dev/null || true

git checkout main
git pull --ff-only origin main
git merge --no-ff "$BRANCH" -m "release: ${VERSION}"
git tag -a "$TAG" -m "Release ${VERSION}"

git checkout develop
git pull --ff-only origin develop
git merge --no-ff main -m "chore: merge release ${VERSION} back into develop"

git branch -d "$BRANCH"
git push origin main develop "$TAG"
git push origin --delete "$BRANCH" 2>/dev/null || true

echo ""
echo "Released ${TAG} on main. Deploy from main for production."
