# Performance Test Report (k6)

Load/performance testing with **k6 v0.55.2**. Scripts live in `performance/k6/`
(smoke / load / stress profiles, shared config + scenario library). Target by default is the
**BFF** at `http://localhost:8090`.

> Thresholds below are **proposed acceptance criteria, not established SLAs**. They should be
> recalibrated on representative hardware. Measurements were taken on the local developer
> machine (Windows 11) with the full Dockerized stack running.

## Scenarios

55–65% reads (list claims), ~30–35% writes (submit claim), ~15–20% admin dashboard.
Each virtual user authenticates **once** (session established in `setup()` and reused),
modelling already-authenticated users and keeping the measurement on the claims/admin APIs.

## Profile A — Smoke (1 VU, 30s) — PASS

```
checks.........................: 100.00%  84 out of 84
http_req_failed................: 0.00%    0 out of 42
http_req_duration..............: avg=184ms  med=117ms  p(90)=260ms  p(95)=288ms  max=2.98s
```
All thresholds met. The single `max` outlier is the first cold request (JIT/connection warm-up).

## Profile B — Load (ramp 0→10→10→0 VUs, ~1m50s) — PASS

```
checks.........................: 100.00%  1686 out of 1686
http_req_failed................: 0.00%    0 out of 845
http_req_duration..............: avg=25.2ms  med=17.8ms  p(50)=17.8ms  p(90)=56.0ms  p(95)=59.0ms  max=384ms
http_reqs......................: 845   (~7.6 req/s)
iterations.....................: 843
```
All thresholds met (p95 59ms ≪ 800ms target; 0% failures).

## Profile C — Stress (ramp 0→20→40→60→0 VUs, ~3m) — PASS

```
checks.........................: 100.00%  11388 out of 11388
http_req_failed................: 0.00%    0 out of 5696
http_req_duration..............: avg=47.1ms  med=36.2ms  p(90)=88.3ms  p(95)=113ms  p(99)=200ms  max=378ms
http_reqs......................: 5696  (~31.5 req/s)
vus_max........................: 60
```
At the configured safe ceiling of 60 VUs the system showed **no degradation and zero
failures** — p99 stayed at 200ms. The breaking point was therefore not reached; raising the
ceiling further would be required to characterise saturation, and should only be done against
a disposable environment.

## Thresholds summary

| Profile | Failure rate | p95 | Result |
| --- | --- | --- | --- |
| smoke | < 1% (0%) | < 1500ms (288ms) | ✅ |
| load | < 1% (0%) | < 800ms (59ms) | ✅ |
| stress | < 10% (0%) | < 3000ms (113ms) | ✅ (no degradation at ceiling) |

## Key finding (environmental)

Naively logging in on **every iteration** with the shared seed accounts under concurrency
trips Keycloak's brute-force *quick-login* protection (near-simultaneous logins of the same
account return transient `401`s, and once tripped the account is briefly locked). The load
scripts therefore authenticate **once** in `setup()` and reuse the session — the realistic
pattern for sustained load and the reason the load/stress runs show 0% auth failures. For
realistic *login-throughput* testing, provision a pool of distinct users or relax brute-force
settings in a dedicated performance realm.

## How to run

```bash
k6 run performance/k6/smoke-test.js
k6 run performance/k6/load-test.js
k6 run performance/k6/stress-test.js      # use with care
k6 run -e BASE_URL=http://localhost:8090 performance/k6/smoke-test.js
```

## Evidence
- `performance/k6/results/smoke-summary.json`
- `performance/k6/results/load-summary.json`
- `performance/k6/results/stress-summary.json`
- `performance/k6/README.md`
