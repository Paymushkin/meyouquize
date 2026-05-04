#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOAD_DIR="${ROOT_DIR}/load"
PROFILE_NAME="${1:-nominal}"
PROFILE_FILE="${LOAD_DIR}/profiles/${PROFILE_NAME}.json"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "Unknown profile: ${PROFILE_NAME}"
  echo "Available: smoke, nominal, peak, soak"
  exit 1
fi

if [[ -z "${BASE_URL:-}" ]]; then
  echo "BASE_URL is required, e.g. https://preprod.example.com"
  exit 1
fi

if [[ -z "${QUIZ_SLUG:-}" ]]; then
  echo "QUIZ_SLUG is required, e.g. spring-forum"
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

RUN_HTTP="$(parse_json_default "${PROFILE_FILE}" run_http true)"
HTTP_VUS="$(parse_json "${PROFILE_FILE}" http_vus)"
HTTP_DURATION="$(parse_json "${PROFILE_FILE}" http_duration)"
PLAYER_COUNT="$(parse_json "${PROFILE_FILE}" player_count)"
RUN_SUBMIT="$(parse_json "${PROFILE_FILE}" run_submit)"
SUBMIT_PLAYERS="$(parse_json "${PROFILE_FILE}" submit_players)"
RUN_DASHBOARD="$(parse_json "${PROFILE_FILE}" run_dashboard)"
DASHBOARD_WAIT_MS="$(parse_json "${PROFILE_FILE}" dashboard_wait_ms)"
HOLD_MS="$(parse_json_default "${PROFILE_FILE}" hold_ms 0)"
REALISTIC_VOTE="$(parse_json_default "${PROFILE_FILE}" realistic_vote false)"
VOTE_WINDOW_MS="$(parse_json_default "${PROFILE_FILE}" vote_window_ms 0)"
VOTE_DISTRIBUTION="$(parse_json_default "${PROFILE_FILE}" vote_distribution normal)"
SUBMIT_TIMEOUT_MS="$(parse_json_default "${PROFILE_FILE}" submit_timeout_ms 12000)"
JOIN_RAMP_MS="$(parse_json_default "${PROFILE_FILE}" join_ramp_ms 0)"
JOIN_ACK_TIMEOUT_MS="$(parse_json_default "${PROFILE_FILE}" join_ack_timeout_ms 15000)"

echo "[load] profile=${PROFILE_NAME}"
echo "[load] out=${out_dir}"
echo "[load] base=${BASE_URL} slug=${QUIZ_SLUG}"
echo "[load] run_http=${RUN_HTTP}"
echo "[load] hold_ms=${HOLD_MS}"
echo "[load] join_ramp_ms=${JOIN_RAMP_MS} join_ack_timeout_ms=${JOIN_ACK_TIMEOUT_MS}"
echo "[load] realistic_vote=${REALISTIC_VOTE} vote_window_ms=${VOTE_WINDOW_MS} vote_distribution=${VOTE_DISTRIBUTION} submit_timeout_ms=${SUBMIT_TIMEOUT_MS}"

set +e
if [[ "${RUN_HTTP}" == "true" ]]; then
  k6 run \
    --summary-export "${out_dir}/k6-summary.json" \
    -e BASE_URL="${BASE_URL}" \
    -e ADMIN_LOGIN="${ADMIN_LOGIN:-}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
    -e HTTP_VUS="${HTTP_VUS}" \
    -e HTTP_DURATION="${HTTP_DURATION}" \
    "${LOAD_DIR}/k6-http.js" | tee "${out_dir}/k6.log"
  k6_code="${PIPESTATUS[0]}"
else
  echo "[load] run_http=false — фаза k6 пропущена (только Socket.IO)" | tee "${out_dir}/k6.log"
  K6_SUMMARY_OUT="${out_dir}/k6-summary.json" node -e '
    const fs = require("fs");
    fs.writeFileSync(
      process.env.K6_SUMMARY_OUT,
      JSON.stringify({
        metrics: {
          http_req_duration: { values: { "p(95)": 0, "p(99)": 0 } },
          http_req_failed: { values: { rate: 0 } },
        },
        note: "k6 skipped (run_http=false)",
      }),
    );
  '
  k6_code=0
fi
set -e

set +e
(
  cd "${ROOT_DIR}/server"
  BASE_URL="${BASE_URL}" \
  QUIZ_SLUG="${QUIZ_SLUG}" \
  PLAYER_COUNT="${PLAYER_COUNT}" \
  RUN_SUBMIT="${RUN_SUBMIT}" \
  SUBMIT_PLAYERS="${SUBMIT_PLAYERS}" \
  RUN_DASHBOARD="${RUN_DASHBOARD}" \
  DASHBOARD_WAIT_MS="${DASHBOARD_WAIT_MS}" \
  HOLD_MS="${HOLD_MS}" \
  REALISTIC_VOTE="${REALISTIC_VOTE}" \
  VOTE_WINDOW_MS="${VOTE_WINDOW_MS}" \
  VOTE_DISTRIBUTION="${VOTE_DISTRIBUTION}" \
  SUBMIT_TIMEOUT_MS="${SUBMIT_TIMEOUT_MS}" \
  JOIN_RAMP_MS="${JOIN_RAMP_MS}" \
  JOIN_ACK_TIMEOUT_MS="${JOIN_ACK_TIMEOUT_MS}" \
  QUIZ_ID="${QUIZ_ID:-}" \
  QUESTION_ID="${QUESTION_ID:-}" \
  OPTION_ID="${OPTION_ID:-}" \
  node scripts/socket-load-burst.mjs
) | tee "${out_dir}/socket.log"
socket_code="${PIPESTATUS[0]}"
set -e

cat > "${out_dir}/meta.env" <<EOF
PROFILE=${PROFILE_NAME}
BASE_URL=${BASE_URL}
QUIZ_SLUG=${QUIZ_SLUG}
RUN_HTTP=${RUN_HTTP}
HTTP_VUS=${HTTP_VUS}
HTTP_DURATION=${HTTP_DURATION}
PLAYER_COUNT=${PLAYER_COUNT}
RUN_SUBMIT=${RUN_SUBMIT}
SUBMIT_PLAYERS=${SUBMIT_PLAYERS}
RUN_DASHBOARD=${RUN_DASHBOARD}
DASHBOARD_WAIT_MS=${DASHBOARD_WAIT_MS}
HOLD_MS=${HOLD_MS}
REALISTIC_VOTE=${REALISTIC_VOTE}
VOTE_WINDOW_MS=${VOTE_WINDOW_MS}
VOTE_DISTRIBUTION=${VOTE_DISTRIBUTION}
SUBMIT_TIMEOUT_MS=${SUBMIT_TIMEOUT_MS}
JOIN_RAMP_MS=${JOIN_RAMP_MS}
JOIN_ACK_TIMEOUT_MS=${JOIN_ACK_TIMEOUT_MS}
QUIZ_ID=${QUIZ_ID:-}
QUESTION_ID=${QUESTION_ID:-}
OPTION_ID=${OPTION_ID:-}
EOF

echo "[load] done: k6=${k6_code}, socket=${socket_code}"

if [[ "${k6_code}" -ne 0 || "${socket_code}" -ne 0 ]]; then
  echo "[load] one of test phases failed. check ${out_dir}"
  exit 1
fi

echo "[load] all phases passed. artifacts: ${out_dir}"
