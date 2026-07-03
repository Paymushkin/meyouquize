#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOAD_DIR="${ROOT_DIR}/load"
PROFILE_NAME="${1:-event-light-100}"
PROFILE_FILE="${LOAD_DIR}/profiles/${PROFILE_NAME}.json"

VALID_PROFILES="event-light-100 event-normal-300 event-peak-500 event-stress-700"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "Unknown profile: ${PROFILE_NAME}"
  echo "Available: ${VALID_PROFILES}"
  exit 1
fi

if [[ -z "${BASE_URL:-}" ]]; then
  echo "BASE_URL is required, e.g. https://meyou.site"
  exit 1
fi

if [[ -z "${QUIZ_SLUG:-}" ]]; then
  echo "QUIZ_SLUG is required (тестовая комната с открытым вопросом и speaker questions)"
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
out_dir="${LOAD_DIR}/results/${timestamp}-${PROFILE_NAME}"
mkdir -p "${out_dir}"

parse_json() {
  node -e "const p=require(process.argv[1]); const k=process.argv[2]; process.stdout.write(String(p[k]));" "$1" "$2"
}

parse_json_default() {
  node -e "const p=require(process.argv[1]); const k=process.argv[2]; const d=process.argv[3]; const v=p[k]; process.stdout.write(v === undefined || v === null ? String(d) : String(v));" "$1" "$2" "$3"
}

PLAYER_COUNT="$(parse_json "${PROFILE_FILE}" player_count)"
JOIN_RAMP_MS="$(parse_json_default "${PROFILE_FILE}" join_ramp_ms 20000)"
JOIN_ACK_TIMEOUT_MS="$(parse_json_default "${PROFILE_FILE}" join_ack_timeout_ms 25000)"
JOIN_FAIL_TOLERANCE="$(parse_json_default "${PROFILE_FILE}" join_fail_tolerance 1)"
VOTE_WINDOW_MS="$(parse_json_default "${PROFILE_FILE}" vote_window_ms 60000)"
VOTE_DISTRIBUTION="$(parse_json_default "${PROFILE_FILE}" vote_distribution normal)"
SUBMIT_TIMEOUT_MS="$(parse_json_default "${PROFILE_FILE}" submit_timeout_ms 20000)"
SUBMIT_FAIL_MAX_RATE="$(parse_json_default "${PROFILE_FILE}" submit_fail_max_rate 0.05)"
HOLD_MS="$(parse_json_default "${PROFILE_FILE}" hold_ms 30000)"
POST_VOTE_PAUSE_MS="$(parse_json_default "${PROFILE_FILE}" post_vote_pause_ms 1000)"
SPEAKER_CREATE_SPREAD_MS="$(parse_json_default "${PROFILE_FILE}" speaker_create_spread_ms 2500)"
SPEAKER_REACT_SPREAD_MS="$(parse_json_default "${PROFILE_FILE}" speaker_react_spread_ms 2500)"
REACTION_SPREAD_MS="$(parse_json_default "${PROFILE_FILE}" reaction_spread_ms 1500)"
SPEAKER_CREATE_RATIO="$(parse_json_default "${PROFILE_FILE}" speaker_create_ratio 0.1)"
SPEAKER_REACT_RATIO="$(parse_json_default "${PROFILE_FILE}" speaker_react_ratio 0.3)"
REACTION_RATIO="$(parse_json_default "${PROFILE_FILE}" reaction_ratio 0.15)"

echo "[load] profile=${PROFILE_NAME}"
echo "[load] out=${out_dir}"
echo "[load] base=${BASE_URL} slug=${QUIZ_SLUG}"
echo "[load] players=${PLAYER_COUNT} join_ramp_ms=${JOIN_RAMP_MS} vote_window_ms=${VOTE_WINDOW_MS}"

set +e
(
  cd "${ROOT_DIR}/server"
  BASE_URL="${BASE_URL}" \
  QUIZ_SLUG="${QUIZ_SLUG}" \
  PROFILE_NAME="${PROFILE_NAME}" \
  PLAYER_COUNT="${PLAYER_COUNT}" \
  JOIN_RAMP_MS="${JOIN_RAMP_MS}" \
  JOIN_ACK_TIMEOUT_MS="${JOIN_ACK_TIMEOUT_MS}" \
  JOIN_FAIL_TOLERANCE="${JOIN_FAIL_TOLERANCE}" \
  VOTE_WINDOW_MS="${VOTE_WINDOW_MS}" \
  VOTE_DISTRIBUTION="${VOTE_DISTRIBUTION}" \
  SUBMIT_TIMEOUT_MS="${SUBMIT_TIMEOUT_MS}" \
  SUBMIT_FAIL_MAX_RATE="${SUBMIT_FAIL_MAX_RATE}" \
  HOLD_MS="${HOLD_MS}" \
  POST_VOTE_PAUSE_MS="${POST_VOTE_PAUSE_MS}" \
  SPEAKER_CREATE_SPREAD_MS="${SPEAKER_CREATE_SPREAD_MS}" \
  SPEAKER_REACT_SPREAD_MS="${SPEAKER_REACT_SPREAD_MS}" \
  REACTION_SPREAD_MS="${REACTION_SPREAD_MS}" \
  SPEAKER_CREATE_RATIO="${SPEAKER_CREATE_RATIO}" \
  SPEAKER_REACT_RATIO="${SPEAKER_REACT_RATIO}" \
  REACTION_RATIO="${REACTION_RATIO}" \
  QUIZ_ID="${QUIZ_ID:-}" \
  QUESTION_ID="${QUESTION_ID:-}" \
  OPTION_ID="${OPTION_ID:-}" \
  SUMMARY_OUT="${out_dir}/summary.json" \
  node scripts/event-load.mjs
) | tee "${out_dir}/event-load.log"
socket_code="${PIPESTATUS[0]}"
set -e

cat > "${out_dir}/meta.env" <<EOF
PROFILE=${PROFILE_NAME}
BASE_URL=${BASE_URL}
QUIZ_SLUG=${QUIZ_SLUG}
PLAYER_COUNT=${PLAYER_COUNT}
JOIN_RAMP_MS=${JOIN_RAMP_MS}
VOTE_WINDOW_MS=${VOTE_WINDOW_MS}
HOLD_MS=${HOLD_MS}
EOF

echo "[load] done: exit=${socket_code}"
echo "[load] artifacts: ${out_dir}"

if [[ "${socket_code}" -eq 0 ]]; then
  echo "[load] вердикт: УСПЕХ — см. блок «ИТОГ ПРОГОНА» в ${out_dir}/event-load.log"
else
  echo "[load] вердикт: ПРОВАЛ — см. блок «ИТОГ ПРОГОНА» в ${out_dir}/event-load.log"
fi

if [[ "${socket_code}" -ne 0 ]]; then
  exit "${socket_code}"
fi
