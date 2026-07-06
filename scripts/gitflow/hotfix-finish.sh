#!/usr/bin/env bash
# Завершить hotfix: hotfix/X.Y.Z → main (tag) → develop.
# usage: bash scripts/gitflow/hotfix-finish.sh 0.2.1
set -euo pipefail

VERSION="${1:?usage: $0 <semver>  e.g. 0.2.1}"
BRANCH="hotfix/${VERSION}"
TAG="v${VERSION}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT"
git fetch origin

if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "branch $BRANCH not found" >&2
  exit 1
fi

git checkout "$BRANCH"

node scripts/gitflow/bump-version.mjs "$VERSION"
git add package.json client/package.json server/package.json shared/package.json
git commit -m "chore(hotfix): bump version to ${VERSION}" || true

git checkout main
git pull --ff-only origin main
git merge --no-ff "$BRANCH" -m "hotfix: ${VERSION}"
git tag -a "$TAG" -m "Hotfix ${VERSION}"

git checkout develop
git pull --ff-only origin develop
git merge --no-ff main -m "chore: merge hotfix ${VERSION} into develop"

git branch -d "$BRANCH"
git push origin main develop "$TAG"
git push origin --delete "$BRANCH" 2>/dev/null || true

echo ""
echo "Hotfix ${TAG} released on main."
