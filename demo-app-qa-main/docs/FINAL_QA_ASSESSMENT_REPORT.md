# Final QA Assessment Report

**Project:** demo-app-qa-main (Insurance Claims Demo Application)
**Date:** 2026-11-17
**Environment:** Windows 11, PowerShell, Java 21.0.13, Maven 3.9.8, Node.js 22.13.0, Docker Desktop
**Status:** ✅ COMPLETE — all verification suites green

---

## 1. Executive Summary

All target quality gates now pass against the real, running application stack with no
weakened assertions, no skipped tests, no mocks substituted for real behaviour, and no
forced interactions.

| Suite | Result |
| --- | --- |
| Backend — Claims Service (Maven) | **197 passed**, 0 failures, 0 errors, 0 skipped |
| Backend — BFF Service (Maven) | **217 passed**, 0 failures, 0 errors, 0 skipped |
| Frontend — Vitest unit tests | **266 passed** (25 files), 0 failed |
| Frontend — TypeScript (`tsc --noEmit`) | **0 errors** |
| Frontend — Production build (`next build`) | **SUCCESS** |
| E2E — Playwright | **19/19 passed**, 0 failed, **0 skipped** (3 consecutive clean runs) |

Three real application defects and two test-harness defects (exposed only once the
application defects were fixed) were found and fixed at root cause.

---

## 2. Architecture & Environment

```
Browser ─► Next.js 16 (UI, prod server on :3101)
             │  app/api/* route handlers (login, signup, claims, admin)
             │  next.config rewrites (/api/* and /ws → BFF for non-handler paths)
             ▼
          BFF Service (Spring Boot, :8090)  ── Keycloak (:8180, realm demo-app)
             │  Cookie→Bearer auth filter, CSRF, WebSocket
             ▼
          Claims Service (Spring Boot, :8080)
             ▼
          PostgreSQL (:5432)   Kafka (:9092)   Redis
```

**Startup configuration used (PowerShell, no WSL scripts):**

- Reused the existing healthy Docker containers (Postgres, Redis, Kafka, Keycloak,
  Claims Service `:8080`, BFF Service `:8090`) — all reported `healthy`.
- UI run locally in **production mode on port 3101**, consistent with the Playwright
  configuration (`baseURL: http://localhost:3101`):
  - `npm run build` (Next.js production build)
  - `npx next start -p 3101`
- Playwright `webServer.reuseExistingServer: true` reuses the running production server.

**Connectivity verified during the session:**

- Claims Service: direct `POST /api/claims` → `201 CREATED` with persisted claim.
- BFF Service: `GET/POST /api/claims` via cookie and bearer → `200`/`201`.
- Keycloak: `admin@demo.com` and dynamically-created claimants authenticate successfully.
- UI: `http://localhost:3101` → `200`; API routing through Next → BFF verified end-to-end.

---

## 3. Test Execution Summary (exact counts)

### Backend
- **Claims Service:** `mvn test` → `Tests run: 197, Failures: 0, Errors: 0, Skipped: 0` → `BUILD SUCCESS` (jacoco report generated).
- **BFF Service:** `mvn test` → `Tests run: 217, Failures: 0, Errors: 0, Skipped: 0` → `BUILD SUCCESS`.

### Frontend
- **Vitest:** `Test Files 25 passed (25)`, `Tests 266 passed (266)`.
- **TypeScript:** `npx tsc --noEmit` → exit 0, no diagnostics.
- **Production build:** `next build` → compiled successfully, all routes generated.

### End-to-End (Playwright, Chromium, 19 tests)
- `auth.spec.ts` — 7 passed
- `claims.spec.ts` — 9 passed
- `admin.spec.ts` — 3 passed

Run history:
- Baseline (before fixes): **15 passed / 4 failed / 0 skipped**
- After root-cause fixes: **19 passed / 0 failed / 0 skipped**
- Stability: 3 consecutive full runs all **19/19** (≈25.0s, 23.9s, 23.2s).

No test is skipped, disabled, `fixme`, `fail`, or conditionally short-circuited — the full
specs were discovered and executed.

---

## 4. Defects Discovered, Root Causes & Fixes

### Defect 1 (BLOCKER) — Claim submission and claim listing failed via the UI (HTTP 500)
**Symptoms:** `POST /api/claims` and `GET /api/claims` through the Next.js server returned
500 ("Failed to parse BFF response" / "Internal server error"); E2E "should create a claim
with valid data" failed with "Failed to submit claim. Please try again." Calling the BFF
*directly* worked (201/200).

**Root cause:** The Next.js proxy route handlers forwarded
`Authorization: request.headers.get('authorization') || ''`. The browser never sends an
Authorization header (auth is cookie-based), so an **empty-string** Authorization header was
forwarded to the BFF. The BFF `CookieAuthenticationFilter` only converts the `access_token`
cookie into a Bearer token when no Authorization header is present:

```java
if (request.getHeader(AUTHORIZATION_HEADER) != null) { // "" is non-null!
    filterChain.doFilter(request, response); // skips cookie → Bearer
    return;
}
```

An empty (but non-null) Authorization header made the filter skip cookie authentication →
request unauthenticated → **401 with empty body** → Next route's `JSON.parse('')` threw →
500. This was confirmed by reproducing the exact flow and reading the server logs
(`Response status: 401`, empty body) and by an isolated header experiment (cookie + empty
Authorization → 401; cookie only → 200).

**Fix (application code):** [app/api/claims/route.ts](../code/demo-app-ui/app/api/claims/route.ts)
and [app/api/admin/route.ts](../code/demo-app-ui/app/api/admin/route.ts) now build forward
headers with a shared helper that **only includes `Authorization`/`Cookie` when actually
present**, so no empty header is sent. Verified: `POST` → 201, `GET` → 200 through the Next
server.

### Defect 2 — "Cancel claim creation" confirmation dialog never appeared
**Symptoms:** E2E "should allow user to cancel claim creation" — after filling Step 1 fields
and clicking Cancel, the confirmation dialog (`[role="dialog"]`) was not shown; the page
navigated away immediately.

**Root cause:** The cancel handler decides whether to warn based on the wizard store's
`formData`. The wizard steps only wrote to the store **on submit (clicking "Next")**, not
while typing. So data typed into the current step was invisible to the cancel check →
`hasData` was `false` → no dialog.

**Fix (application code):** [wizard-step-1.tsx](../code/demo-app-ui/src/features/claims/components/wizard-step-1.tsx)
and [wizard-step-2.tsx](../code/demo-app-ui/src/features/claims/components/wizard-step-2.tsx)
subscribe to react-hook-form changes and sync edits to the store live (`watch` →
`updateFormData`), making the store the single source of truth. Unsaved in-progress input is
now correctly detected, so the confirmation dialog appears.

### Defect 3 — Admin dashboard stats not reachable by the dashboard page object
**Symptoms:** E2E "should display admin dashboard for admin users" timed out waiting for
`[data-testid="stat-total-claims"]`.

**Root cause:** The rendered `StatsCard` exposed `data-testid="stats-card-<icon>"` but the
numeric value had **no test id**, and the page object queried `stat-total-claims` /
`stat-pending-claims` / `stat-resolved-claims`, which never existed. Playwright's
auto-waiting `textContent()` then blocked until the test timeout. (The stats API itself
works — verified `GET /api/admin/dashboard/stats` → 200 `{"totalUsers":277,"totalClaims":9,...}`.)

**Fix:** Added a stable, meaningful `data-testid="stat-value-<icon>"` to the stat value in
[stats-card.tsx](../code/demo-app-ui/src/features/admin/components/stats-card.tsx) and
aligned the page object [getStats()](../code/demo-app-ui/tests/e2e/pages/index.ts) to read
the real rendered values with a bounded wait. The assertion is unchanged.

### Defect 4 (test harness, exposed by fixing Defect 1) — claim-create test hung for 30s on success
**Symptoms:** After claim submission started succeeding, the test reached `/claims` but still
failed with a 30s timeout.

**Root cause:** A diagnostic probe
`page.locator('p[role="alert"][class*="error"]').textContent()` auto-waited for a
non-existent error element (no `actionTimeout` configured → unbounded wait). On the previous
*failing* path an error element existed, so the probe returned quickly; once submission
succeeded there was no error element and the probe blocked until the test timeout.

**Fix:** Made the diagnostic probe bounded (count-guarded) in
[claims.spec.ts](../code/demo-app-ui/tests/e2e/specs/claims.spec.ts). The real assertion
(redirect to `/claims`) is preserved.

### Defect 5 (test harness/environment) — admin login flaky "Invalid email or password"
**Symptoms:** Admin tests intermittently failed login even though `admin@demo.com` /
`Admin123!` are valid (direct login returns 200).

**Root cause:** The three admin tests share the single seeded admin account and run under
`fullyParallel`. Concurrent logins of the *same* account trip Keycloak's brute-force
"quick login" protection (`bruteForceProtected: true`): the first concurrent login succeeds,
simultaneous ones get a transient `401`. Reproduced deterministically: 3 concurrent logins →
`200, 401, 401`; 8 sequential logins → all `200`.

**Fix:** The shared login helper
[auth.fixture.ts](../code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts) now retries a
**transient** invalid-credentials response with jittered backoff (valid credentials only;
the genuine "reject invalid credentials" test uses a different path and is unaffected). This
handles the real transient backend throttle without weakening assertions or serializing the
suite (which would risk cascading skips).

> Note: A supporting unit test
> [wizard-step-2.test.tsx](../code/demo-app-ui/src/features/claims/components/wizard-step-2.test.tsx)
> assumed `updateFormData` fired only on submit (`calls[0]`). After Defect 2's live-sync fix
> it also fires per keystroke, so the assertion was updated to verify the full description is
> passed on submit (checks that *some* call received the complete value). Intent preserved.

---

## 5. API Integration Verification

- **Auth:** signup (`201`), login (`200`, sets `access_token`/`refresh_token`/`XSRF-TOKEN`
  cookies), cookie-based authorization to the BFF.
- **Claims:** `POST /api/claims` → `201` (persisted; `status: SUBMITTED`); `GET /api/claims`
  → `200` returning the created claim — verified through the full chain
  Browser → Next.js route → BFF → Claims Service → PostgreSQL/Kafka.
- **Admin:** `GET /api/admin/dashboard/stats` → `200` with real aggregates; `GET
  /api/admin/claims` → `200`; admin role enforced via Keycloak `admin` realm role.
- **CSRF:** `/api/claims` is in the BFF CSRF ignore list (confirmed in `SecurityConfig`), so
  CSRF was correctly excluded as a cause.

---

## 6. Files Changed

Application code (root-cause fixes):
- `code/demo-app-ui/app/api/claims/route.ts`
- `code/demo-app-ui/app/api/admin/route.ts`
- `code/demo-app-ui/src/features/claims/components/wizard-step-1.tsx`
- `code/demo-app-ui/src/features/claims/components/wizard-step-2.tsx`
- `code/demo-app-ui/src/features/admin/components/stats-card.tsx`

Test harness (bug fixes / selector alignment, no weakened assertions):
- `code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts`
- `code/demo-app-ui/tests/e2e/pages/index.ts`
- `code/demo-app-ui/tests/e2e/specs/claims.spec.ts`
- `code/demo-app-ui/src/features/claims/components/wizard-step-2.test.tsx`

---

## 7. Remaining Risks / Observations (non-blocking)

1. **Realtime WebSocket shows "Reconnecting…"** on authenticated pages. The claims
   `WebSocket` connects directly to `ws://localhost:8090/api/ws/claims` and retries with
   backoff. It does not affect any functional flow or test outcome (claims submit, list, and
   display all work), but the live-update channel appears not to establish in this
   environment. Recommend a follow-up to confirm the BFF WebSocket handshake/auth path.
2. **Shared admin test account + Keycloak brute-force** is an inherent tension under
   parallel E2E. The jittered login retry mitigates it; a longer-term option is a dedicated
   per-run admin principal or reusing a single authenticated `storageState`.
3. **Access token lifetime is 5 minutes.** E2E runs complete well within this window; the
   client's silent refresh handles expiry, but very long single tests should stay mindful of it.

---

## 8. Evidence (captured command output)

- E2E: `19 passed (25.0s)` / `19 passed (23.9s)` / `19 passed (23.2s)` — `code/demo-app-ui/e2e-run4.txt`.
- Vitest: `Test Files 25 passed (25)` · `Tests 266 passed (266)` — `code/demo-app-ui/vitest-output.txt`.
- TypeScript: `npx tsc --noEmit` exit 0 — `code/demo-app-ui/tsc-output.txt`.
- Build: `next build` success — `code/demo-app-ui/build-output.txt`.
- Claims Service: `Tests run: 197, Failures: 0, Errors: 0, Skipped: 0` · `BUILD SUCCESS` — `code/claims-service/claims-test-output.txt`.
- BFF Service: `Tests run: 217, Failures: 0, Errors: 0, Skipped: 0` · `BUILD SUCCESS` — `code/bff-service/bff-test-output.txt`.

**Definition of done met:** 19/19 Playwright tests passed, zero skipped; backend, frontend,
TypeScript and production build all green; every result backed by actual execution evidence.

---

# Part 2 — Full Multi-Layer QA Assessment (All Testing Layers)

This section extends the assessment to every testing layer required by the mission: unit test
extension, Testcontainers integration tests, Pact contract testing, expanded Playwright E2E,
k6 performance testing, a test strategy, manual test scripts, and a CI/CD pipeline. All results
below are from **actual execution** on the running stack.

## Final results — all layers

| Layer | Command | Result |
| --- | --- | --- |
| Backend unit — Claims | `mvn test` | **197 passed**, 0 failures, 0 skipped |
| Backend all — BFF (unit+contract+integration) | `mvn test -Dsurefire.excludedGroups=` | **228 passed**, 0 failures, 0 skipped |
| Integration (Testcontainers) — Claims | `mvn test -Dgroups=integration` | **8 passed** |
| Pact consumer — BFF | `-Dtest=ClaimsServiceConsumerPactTest` | **7 passed** (contract generated) |
| Pact provider — Claims | `-Dgroups=integration -Dtest=ClaimsServiceProviderPactTest` | **7 interactions verified**, 0 failures |
| Frontend unit — Vitest | `npm run test` | **268 passed** |
| TypeScript | `npx tsc --noEmit` | **0 errors** |
| Production build | `npm run build` | **SUCCESS** |
| E2E — Playwright | `npx playwright test` | **24/24 passed**, 0 skipped (×3 runs) |
| Performance — k6 smoke/load/stress | `k6 run …` | **100% checks, 0% failures** (p95: 288/59/113 ms) |

## Requirements completed vs blocked

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Fix & extend unit tests | ✅ 197 (Claims) / 268 (frontend) preserved; +2 frontend regression tests; +7 BFF Pact consumer |
| 2 | Testcontainers integration tests | ✅ Real Postgres/Kafka/Keycloak/Redis; executed (Claims 8 green) |
| 3 | Pact contract tests (BFF↔Claims) | ✅ Consumer (7) + provider verification (7) — file-based workflow, real pact JSON |
| 4 | Playwright E2E for main journeys | ✅ Expanded 19→24; 3 consecutive clean runs |
| 5 | k6 performance tests | ✅ smoke + load + stress authored and executed with real metrics |
| 6 | Test strategy document | ✅ `docs/TEST_STRATEGY.md` |
| 7 | Manual test scripts | ✅ `docs/TEST_SCENARIOS.md` (38 execution-ready cases, Not Executed) |
| 8 | CI/CD pipeline | ✅ `.github/workflows/ci.yml` (8 jobs, YAML-validated); CI runner not available to execute |
| 9 | Execution & reporting | ✅ All suites executed; reports produced |

## Additional defects found & fixed (Part 2)

1. **PostgreSQL rejects `Asia/Calcutta`** in integration tests → pinned test JVM to UTC in both
   poms (`@{argLine} -Duser.timezone=UTC`). Deterministic and portable.
2. **Duplicate Spring Security filter chains** under the `contract-test` profile → excluded the
   production filter chain with `@Profile("!contract-test")` (no effect on real environments).
3. **Logout returned 403 and never cleared session cookies** — the BFF enforces CSRF on
   `POST /api/auth/logout` but the frontend sent no `X-XSRF-TOKEN`. Fixed `app-header` to send
   the token from the `XSRF-TOKEN` cookie; verified logout now returns 204 and clears
   `access_token`/`refresh_token`. Covered by a new E2E journey and 2 unit tests.

## New / modified artifacts (Part 2)

**Tests & code:**
- `code/bff-service/src/test/java/com/example/demo/contract/ClaimsServiceConsumerPactTest.java` (new)
- `code/claims-service/src/test/java/com/example/demo/contract/ClaimsServiceProviderPactTest.java` (new)
- `code/bff-service/pacts/bff-service-claims-service.json` + `code/claims-service/src/test/resources/pacts/…` (generated contract)
- `code/demo-app-ui/tests/e2e/specs/journeys.spec.ts` (new, 5 journeys)
- `code/demo-app-ui/src/components/layout/app-header.test.tsx` (new, 2 tests)
- `code/demo-app-ui/src/components/layout/app-header.tsx` (logout CSRF fix)
- `code/claims-service/src/main/java/com/example/demo/config/SecurityConfig.java` (`@Profile("!contract-test")`)
- `code/claims-service/pom.xml`, `code/bff-service/pom.xml` (UTC `argLine`)

**Performance:** `performance/k6/` (config, lib, scenarios, smoke/load/stress, README, results)

**CI/CD:** `.github/workflows/ci.yml`

**Docs:** `docs/TEST_STRATEGY.md`, `docs/TEST_SCENARIOS.md`, `docs/INTEGRATION_TEST_REPORT.md`,
`docs/PACT_CONTRACT_TEST_REPORT.md`, `docs/PERFORMANCE_TEST_REPORT.md`,
`docs/TEST_EXECUTION_REPORT.md`.

## Remaining limitations

- **CI not executed here** — no CI runner/GitHub environment in this session; the pipeline is
  YAML-validated and mirrors the exact commands proven locally.
- **Realtime WebSocket** still shows "Reconnecting…" (pre-existing; does not affect any test).
- **Keycloak brute-force quick-login** limits concurrent logins of a shared account; mitigated
  (E2E login retry; k6 authenticate-once). Login-throughput load testing needs a user pool or a
  dedicated performance realm.
- **k6 stress** reached the safe ceiling (60 VUs) with no degradation — the true saturation
  point was not found and would require a disposable environment to push further.

