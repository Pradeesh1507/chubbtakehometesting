# Performance Testing (k6)

Performance and load tests for the Insurance Claims demo, written in [k6](https://k6.io).

## Layout

```
performance/k6/
├── config/
│   └── environment.js     # Base URLs, credentials, thresholds, load profiles (env-overridable)
├── lib/
│   └── auth.js            # Login helper (cookie-based) + claim payload builder
├── scenarios/
│   └── workflows.js       # Reusable scenario functions (auth, list, submit, admin, mixed)
├── data/                  # (reserved for CSV/JSON test data)
├── results/               # (git-ignored) JSON/summary output
├── smoke-test.js          # Profile A: 1 VU, 30s — verify scripts & environment
├── load-test.js           # Profile B: ramp to 10 VUs — realistic steady workload
└── stress-test.js         # Profile C: ramp to 60 VUs — degradation characterisation
```

## Prerequisites

- A running stack. By default the scripts target the **BFF** at `http://localhost:8090`.
- Seeded accounts (present in the Keycloak `demo-app` realm):
  - Claimant: `claimant@demo.com` / `Claimant123!`
  - Admin: `admin@demo.com` / `Admin123!`
- k6 installed, or the standalone `k6` binary on `PATH`.

## Running

```bash
# Smoke (fast sanity check)
k6 run performance/k6/smoke-test.js

# Load (realistic workload)
k6 run performance/k6/load-test.js

# Stress (degradation — use with care)
k6 run performance/k6/stress-test.js

# Override target / credentials
k6 run -e BASE_URL=http://localhost:3101 performance/k6/smoke-test.js
k6 run -e CLAIMANT_EMAIL=foo@bar.com -e CLAIMANT_PASSWORD=Secret1! performance/k6/load-test.js

# Save machine-readable results
k6 run --summary-export performance/k6/results/smoke-summary.json performance/k6/smoke-test.js
```

## Scenarios

| Scenario | Flow | Key checks |
| --- | --- | --- |
| Auth | `POST /api/auth/login` | 200 + user id returned |
| List claims | login → `GET /api/claims` | 200 + array body |
| Submit claim | login → `POST /api/claims` | 201 + claimId returned |
| Admin dashboard | admin login → `GET /api/admin/dashboard/stats` | 200 + totals |
| Mixed | 55% list / 30% submit / 15% admin | per-scenario checks |

## Profiles & thresholds

Thresholds are **proposed acceptance criteria, not established SLAs** — calibrate to your
hardware. Defaults (see `config/environment.js`):

| Profile | VUs / stages | Failure rate | Latency | Checks |
| --- | --- | --- | --- | --- |
| smoke | 1 VU, 30s | < 1% | p95 < 1500ms | > 99% |
| load | ramp 0→10→10→0 | < 1% | p95 < 800ms, p99 < 1500ms | > 99% |
| stress | ramp 0→20→40→60→0 | < 10% | p95 < 3000ms | (characterise) |

## Notes

- Authentication is cookie-based; k6's per-VU cookie jar replays the `access_token` cookie
  automatically after login.
- Think-time (`sleep(1)`) is included between user actions to model real usage.
- `submit-claim` writes real rows to PostgreSQL and emits Kafka events — run load/stress
  against disposable environments.
