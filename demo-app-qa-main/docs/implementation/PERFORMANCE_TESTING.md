# Implementation Guide — k6 Performance Testing

How the performance suite is built and run. For *results* see
[../PERFORMANCE_TEST_REPORT.md](../PERFORMANCE_TEST_REPORT.md); for *what/why* see
[../TEST_STRATEGY.md](../TEST_STRATEGY.md).

## Purpose
Characterise latency, throughput and error rate of the claims/admin APIs under smoke, load and
stress profiles, with proposed (not SLA) thresholds.

## Architecture
```
performance/k6/
├── config/environment.js    # BASE_URL, credentials, THRESHOLDS, PROFILES (env-overridable)
├── lib/auth.js              # login(), authenticate() (setup), buildClaimPayload()
├── scenarios/workflows.js   # auth/list/submit/admin + mixedWorkloadScenario
├── smoke-test.js            # Profile A — 1 VU, 30s
├── load-test.js             # Profile B — ramp 0→10→10→0
├── stress-test.js           # Profile C — ramp 0→20→40→60→0
├── results/                 # --summary-export JSON
└── README.md
```
Default target: BFF at `http://localhost:8090` (override with `-e BASE_URL=…`).

## How it works
- **Authenticate once per run** in k6 `setup()` (`authenticate()` returns the `access_token`
  cookie); all VUs reuse the session via an explicit `Cookie` header. This models
  already-authenticated users and **avoids Keycloak's brute-force quick-login throttle** that a
  naive per-iteration login would trip under concurrency.
- Mixed workload: ~1 in 5 VUs act as admin; claimants do 65% list / 35% submit; 1s think-time.
- Each request carries `check()`s (status + body shape) and a `name` tag for per-endpoint stats.

## Important configuration
- `PROFILES` in `config/environment.js` define stages + thresholds per profile.
- Thresholds (proposed): smoke `http_req_failed<0.01`, `p(95)<1500`; load `<0.01`, `p(95)<800`,
  `p(99)<1500`, `checks>0.99`; stress `<0.10`, `p(95)<3000`.
- Credentials/URLs overridable: `-e BASE_URL=`, `-e CLAIMANT_EMAIL=`, `-e CLAIMANT_PASSWORD=`, etc.

## Run
```bash
k6 run performance/k6/smoke-test.js
k6 run --summary-export performance/k6/results/load-summary.json performance/k6/load-test.js
k6 run performance/k6/stress-test.js        # use with care; writes real rows + Kafka events
```
If k6 is not installed, download the standalone binary from
`https://github.com/grafana/k6/releases` (Windows amd64 zip) and put `k6.exe` on PATH.

## Expected results (local, reference)
| Profile | VUs | Error rate | p50 | p95 | Throughput | Checks |
| --- | --- | --- | --- | --- | --- | --- |
| smoke | 1 | 0% | 117ms | 288ms | ~1.3/s | 84/84 |
| load | 10 | 0% | 17.8ms | 59ms | ~7.6/s | 1686/1686 |
| stress | 60 | 0% | 36ms | 113ms | ~31.5/s | 11388/11388 |

## Troubleshooting
- **High login 401s / failing checks under load** → you are logging in per iteration; use the
  `setup()` + reused-cookie pattern (already in load/stress). Keycloak brute-force locks a shared
  account that is logged in concurrently.
- **`connect ECONNREFUSED`** → the BFF (8090) or chosen `BASE_URL` is down.
- **Thresholds crossed (exit 99)** → inspect `http_req_failed` and the per-endpoint `name` tags;
  distinguish real latency regressions from auth/throttle artefacts.
- **Login-throughput testing** → provision a pool of distinct users or relax brute force in a
  dedicated performance realm; the shared seed accounts are not suitable for login load.
