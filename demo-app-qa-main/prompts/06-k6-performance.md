# QA-006 — k6 Performance Testing

- **Prompt ID:** QA-006
- **Name:** Performance testing with k6
- **Version:** 1.0
- **Status:** ACTIVE. **RECONSTRUCTED** — synthesized from the Part-2 "all testing layers"
  assessment prompt (per-layer wording was part of a combined prompt). Not a verbatim original.
- **Execution status:** Executed — smoke/load/stress all 100% checks, 0% errors. See
  `docs/implementation/PERFORMANCE_TESTING.md`, `docs/PERFORMANCE_TEST_REPORT.md`.

## Objective
Build a maintainable k6 suite (smoke/load/stress) and capture real metrics with proposed
thresholds (not SLAs).

## Context & prerequisites
- k6 installed (or standalone binary). Target BFF `http://localhost:8090` by default.
- Read `docs/implementation/PERFORMANCE_TESTING.md`.

## Reusable prompt text
```
Create a maintainable k6 performance suite under performance/k6 (config, lib, scenarios, and
smoke/load/stress profiles) for: authentication/login, claims list, claims submission, admin
dashboard stats, and a mixed workload.

Requirements: configurable VUs/ramp/duration; env-based base URLs & credentials; reusable auth +
request helpers; response-time (p50/p90/p95), throughput, HTTP failure-rate metrics; checks and
thresholds. Profiles: A) smoke (very low concurrency, short), B) load (realistic steady), C)
stress (ramp to a SAFE ceiling, characterise degradation).

Authenticate ONCE per run (k6 setup) and reuse the session to avoid Keycloak brute-force
throttling of shared accounts. Do not launch uncontrolled load locally. Execute smoke + load
(and stress if safe); record ACTUAL results. Document thresholds as PROPOSED acceptance criteria,
not established SLAs. Never invent performance numbers.
```

## Execution steps
1. `k6 run performance/k6/smoke-test.js` (verify env/scripts).
2. `k6 run --summary-export performance/k6/results/load-summary.json performance/k6/load-test.js`.
3. Optionally `k6 run performance/k6/stress-test.js` (disposable env).

## Verification
- Smoke/load/stress: `http_req_failed` 0%, `checks` 100%, thresholds PASS; metrics saved to
  `performance/k6/results/*.json`.

## Related files
- `performance/k6/{config/environment.js, lib/auth.js, scenarios/workflows.js, *-test.js, README.md, results/*.json}`
