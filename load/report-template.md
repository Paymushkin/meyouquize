# Load Test Report

## Scope

- Commit SHA:
- Environment: pre-prod / production-like
- Profile: smoke | nominal | peak | soak
- Date/time:

## Workload

- BASE_URL:
- QUIZ_SLUG:
- HTTP: VUs + duration
- Socket: player count, submit burst, dashboard mode

## Results

- HTTP latency: p50 / p95 / p99
- HTTP errors: xx%
- Socket join round-trip: p50 / p95 / max
- Socket submit round-trip: p50 / p95 / max
- App errors (socket + HTTP):

## Saturation

- CPU (avg/peak):
- RAM (avg/peak):
- Postgres connections (avg/peak):
- Postgres slow queries:

## SLO Check

- [ ] HTTP p95 < 500ms
- [ ] Socket p95 < 700ms
- [ ] Error-rate nominal < 1%
- [ ] Error-rate peak < 2%
- [ ] Нет деградации памяти на soak

## Bottlenecks Found

1.
2.
3.

## Tuning Applied

1.
2.

## Re-run Outcome

- Before:
- After:

## Decision

- GO / NO-GO
- Risks:
- Required follow-ups:
