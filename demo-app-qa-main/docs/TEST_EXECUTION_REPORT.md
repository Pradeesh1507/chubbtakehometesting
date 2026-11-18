# Test Execution Report

Consolidated, evidence-backed results for every test layer in the Insurance Claims demo.
All results below were produced by **actual execution** this session on Windows 11 / PowerShell
(Java 21.0.13, Maven 3.9.8, Node 22.13.0, Docker Desktop, k6 0.55.2) against the running stack.

## Summary

| Layer | Command | Result |
| --- | --- | --- |
| Backend unit — Claims | `mvn test` | **197 passed**, 0 failures, 0 skipped — BUILD SUCCESS |
| Backend unit+contract — BFF | `mvn test` (default) | includes 7 Pact consumer tests; see all-run below |
| Backend all — BFF | `mvn test -Dsurefire.excludedGroups=` | **228 passed**, 0 failures, 0 skipped — BUILD SUCCESS |
| Integration (Testcontainers) — Claims | `mvn test -Dgroups=integration` | **8 passed** — BUILD SUCCESS |
| Integration (Testcontainers) — BFF | included in BFF all run | Kafka consumer + RBAC integration green |
| Pact consumer — BFF | `mvn test -Dtest=ClaimsServiceConsumerPactTest` | **7 passed**, pact generated |
| Pact provider — Claims | `mvn test -Dgroups=integration -Dtest=ClaimsServiceProviderPactTest` | **7 interactions verified**, 0 failures — BUILD SUCCESS |
| Frontend unit — Vitest | `npm run test` | **268 passed** (25+1 files), 0 failures |
| TypeScript | `npx tsc --noEmit` | **0 errors** |
| Production build | `npm run build` | **SUCCESS** |
| E2E — Playwright | `npx playwright test` | **24/24 passed**, 0 skipped — 3 consecutive runs |
| Performance — k6 smoke | `k6 run performance/k6/smoke-test.js` | **100% checks**, 0% failures, p95≈288ms |
| Performance — k6 load | `k6 run performance/k6/load-test.js` | **100% checks** (1686), 0% failures, p95≈59ms |
| Performance — k6 stress | `k6 run performance/k6/stress-test.js` | **100% checks** (11388), 0% failures, p95≈113ms, 60 VUs |

## E2E stability (3 consecutive full-suite runs)

| Run | Result | Duration |
| --- | --- | --- |
| 1 | 24/24 passed | 36.9s |
| 2 | 24/24 passed | 31.7s |
| 3 | 24/24 passed | 30.0s |

E2E specs: `auth.spec.ts` (7), `claims.spec.ts` (9), `admin.spec.ts` (3), **`journeys.spec.ts` (5, new)**.
New journeys: logout + route protection, duplicate-signup rejection, claim persistence after
reload, view claim details, claimant→admin access restriction.

## New tests added this session

| Area | Added | Nature |
| --- | --- | --- |
| Pact consumer (BFF) | 7 | consumer-driven contract (real OkHttp client vs mock server) |
| Pact provider (Claims) | 7 | provider verification (full app + Testcontainers + `@State` seeding) |
| Playwright E2E | 5 | new end-to-end user journeys |
| Frontend unit | 2 | `app-header` logout CSRF-header regression tests |

## Defects found & fixed this session

| # | Defect | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | Integration tests fail to boot | pgjdbc forwards legacy `Asia/Calcutta` zone; PostgreSQL rejects it | Pin test JVM to UTC in both poms (surefire `argLine`) |
| 2 | Pact provider: duplicate filter chains | prod `SecurityConfig` not excluded under `contract-test` | `@Profile("!contract-test")` on the main filter chain |
| 3 | Logout returns 403, cookies never cleared | BFF enforces CSRF on `/api/auth/logout` but frontend sent no `X-XSRF-TOKEN` | Send `X-XSRF-TOKEN` from the `XSRF-TOKEN` cookie in `app-header` logout |

(Earlier session also fixed: empty-Authorization proxy header → 401; claim-cancel dialog
form-state sync; admin dashboard stat test id; Keycloak concurrent-login retry in E2E.)

## Reproduce everything

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'

# Backend unit
cd code\claims-service ; mvn test
cd code\bff-service    ; mvn test

# Integration (Testcontainers) + Pact provider  (Docker required)
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"
cd code\bff-service    ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"

# Pact consumer -> provider
cd code\bff-service    ; mvn test "-Dtest=ClaimsServiceConsumerPactTest"
Copy-Item code\bff-service\pacts\*.json code\claims-service\src\test\resources\pacts\ -Force
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration" "-Dtest=ClaimsServiceProviderPactTest"

# Frontend
cd code\demo-app-ui ; npm run test ; npx tsc --noEmit ; npm run build

# E2E (UI prod server on 3101 reused by Playwright)
cd code\demo-app-ui ; npx next start -p 3101   # in a background shell
cd code\demo-app-ui ; npx playwright test

# Performance
k6 run performance\k6\smoke-test.js
k6 run performance\k6\load-test.js
```

## Evidence files
- Backend: `code/claims-service/claims-unit-output.txt`, `claims-integration-output.txt`, `pact-provider-output.txt`; `code/bff-service/bff-all-tests-output.txt`, `pact-consumer-output.txt`
- Frontend: `code/demo-app-ui/vitest-output.txt`, `tsc-output.txt`, `build-output.txt`
- E2E: `code/demo-app-ui/e2e-full-run1.txt` … `e2e-full-run3.txt`
- Performance: `performance/k6/results/*.json`
