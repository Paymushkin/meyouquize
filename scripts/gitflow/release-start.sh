#!/usr/bin/env bash
# Начать релиз: develop → release/X.Y.Z, bump version.
# usage: bash scripts/gitflow/release-start.sh 0.2.0
set -euo pipefail

VERSION="${1:?usage: $0 <semver>  e.g. 0.2.0}"
BRANCH="release/${VERSION}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "invalid semver: $VERSION" >&2
  exit 1
fi

cd "$ROOT"
git fetch origin

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "branch $BRANCH already exists" >&2
  exit 1
fi

git checkout develop
git pull --ff-only origin develop

node scripts/gitflow/bump-version.mjs "$VERSION"

git add package.json client/package.json server/package.json shared/package.json
git commit -m "chore(release): bump version to ${VERSION}"
git checkout -b "$BRANCH"

echo ""
echo "Release branch $BRANCH created."
echo "Next: fix bugs if needed, then: bash scripts/gitflow/release-finish.sh ${VERSION}"
