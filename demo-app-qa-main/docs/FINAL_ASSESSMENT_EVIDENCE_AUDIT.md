# Final Assessment — Evidence Audit

**Audit date:** 2026-11-17
**Auditor action:** read-only verification. No application code or tests were modified during
this audit.
**Environment:** Windows 11 / PowerShell; Java 21.0.13; Maven 3.9.8; Node 22.13.0;
Docker Desktop; k6 0.55.2.

This audit re-inspects the actual artifacts and execution outputs produced during the QA
assessment. Each item is labelled:

- ✅ **VERIFIED (this audit)** — re-confirmed now from actual files / command output.
- 🟡 **REPORTED (session evidence)** — produced by actual execution earlier this session;
  evidence file exists and is cited, but the suite was not re-run during this audit.
- ⚠️ **LIMITATION** — not executed / cannot be verified here.

---

## 1. BFF test count breakdown — ✅ VERIFIED (this audit)

Source: parsed every `code/bff-service/target/surefire-reports/TEST-*.xml` (`testsuite@tests`).

- **Total = 228 tests across 33 distinct test classes; 0 failures, 0 errors, 0 skipped.**
- The sum of per-class `tests` attributes equals 228 exactly (no aggregate/duplicate testsuite).

Breakdown by category:

| Category | Tests | Notes |
| --- | --- | --- |
| Pact consumer — `contract.ClaimsServiceConsumerPactTest` | **7** | one dedicated class, counted once |
| Integration (`@Tag("integration")`) — `ClaimEventKafkaConsumerIntegrationTest` (3) + `RbacIntegrationTest` (11) | **14** | real Kafka / full security chain |
| Unit (all other 30 classes) | **207** | controllers, use-cases, adapters, mappers, security, ArchUnit, etc. |
| **Total** | **228** | 207 + 7 + 14 |

**No double counting:** the 7 Pact consumer tests appear in exactly one class
(`contract.ClaimsServiceConsumerPactTest`); it is distinct from every unit and integration
class. 207 + 7 + 14 = 228.

> Note: an earlier Part-1 note cited "217 BFF unit". The **verified** current figures are
> 207 pure-unit + 7 Pact consumer + 14 integration = 228 total (the Pact consumer class did
> not exist when the 217 figure was recorded). Treat 228 / the split above as authoritative.

---

## 2. Testcontainers integration — ✅ VERIFIED (this audit)

Test classes inspected:
- `code/claims-service/.../adapter/out/persistence/ClaimRepositoryIntegrationTest.java`
  (`@DataJpaTest`, `@Testcontainers`, `@Tag("integration")`, real `PostgreSQLContainer`).
- `code/claims-service/.../TestcontainersConfiguration.java` — real `PostgreSQLContainer`,
  `KafkaContainer(apache/kafka-native)`, `GenericContainer(redis)`, `KeycloakContainer`
  wired via `@ServiceConnection` / `@DynamicPropertyRegistrar`.

Real containers actually started (from `code/claims-service/claims-integration-output.txt`):
```
Container testcontainers/ryuk:0.13.0 started ...
Container postgres:15-alpine started in PT5.73s
Container apache/kafka-native:latest started in PT2.59s
Container postgres:latest started in PT4.08s
Container redis:latest started in PT0.97s
Container quay.io/keycloak/keycloak:26.1.4 is starting ...
```
These are genuine Docker containers (not H2 posing as Postgres).

Execution result (actual): Claims `mvn test -Dgroups=integration` →
`Tests run: 8, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`.

**Defect found & fixed (already applied, re-noted):** pgjdbc forwarded the legacy
`Asia/Calcutta` zone which PostgreSQL rejected; fixed by pinning the test JVM to UTC in both
poms. Integration boots green after the fix.

---

## 3. Pact files & provider consumption — ✅ VERIFIED (this audit)

Files present:
- `code/bff-service/pacts/bff-service-claims-service.json` (consumer-generated)
- `code/claims-service/src/test/resources/pacts/bff-service-claims-service.json` (provider copy)
- `code/claims-service/target/test-classes/pacts/bff-service-claims-service.json` (on test classpath)

Contract content (parsed JSON): **7 interactions** — statuses 200 (get), 403 (forbidden),
409 (user conflict), 201 (create user), 201 (create claim), 200 (list), 404 (not found).

Provider verification consumes the generated contract:
- `ClaimsServiceProviderPactTest` is annotated `@Provider("claims-service")`,
  `@PactFolder("src/test/resources/pacts")`, `@Tag("integration")`, and targets the live app
  via `HttpTestTarget("localhost", port)`.
- Output (`code/claims-service/pact-provider-output.txt`):
  `Verifying a pact between bff-service and claims-service` →
  `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`.

This is genuine consumer-driven contract testing (real OkHttp client on the consumer side,
real Spring app + Testcontainers on the provider side), not hand-compared JSON.

---

## 4. k6 scripts & results — ✅ VERIFIED (this audit)

Scripts inspected: `performance/k6/smoke-test.js`, `load-test.js`, `stress-test.js`,
`config/environment.js`, `lib/auth.js`, `scenarios/workflows.js`. Metrics parsed from the
exported JSON summaries in `performance/k6/results/`.

| Metric | Smoke | Load | Stress |
| --- | --- | --- | --- |
| Profile | 1 VU, 30s | ramp 0→10→10→0 (~1m50s) | ramp 0→20→40→60→0 (~3m) |
| Max VUs | 1 | 10 | 60 |
| Iterations | 6 | 843 | 5694 |
| HTTP requests | 42 | 845 | 5696 |
| Throughput | ~1.32 req/s | ~7.58 req/s | ~31.49 req/s |
| p50 (med) | 117.0 ms | 17.8 ms | 36.2 ms |
| p90 | 259.5 ms | 56.0 ms | 88.3 ms |
| p95 | 288.0 ms | 59.0 ms | 112.9 ms |
| p99 | n/a* | n/a* | ~200 ms (console) |
| max | 2988.6 ms | 383.9 ms | 378.0 ms |
| Error rate (`http_req_failed`) | 0% | 0% | 0% |
| Checks | 84/84 (100%) | 1686/1686 (100%) | 11388/11388 (100%) |
| Thresholds | PASS | PASS | PASS |

\* The `--summary-export` JSON records avg/min/med/p(90)/p(95)/max; p99 is not in the JSON.
The stress p99 (~200 ms) comes from the k6 console summary (`summaryTrendStats`), not the JSON.
Smoke `max` 2.99s is the first cold-start request (connection/JIT warm-up), not a sustained p95.

Threshold definitions (from `config/environment.js`): smoke `http_req_failed<0.01`,
`p(95)<1500`; load `<0.01`, `p(95)<800`, `p(99)<1500`, `checks>0.99`; stress `<0.10`,
`p(95)<3000`. All met.

---

## 5. TEST_STRATEGY.md coverage — ✅ VERIFIED (this audit)

`docs/TEST_STRATEGY.md` contains 22 numbered sections covering every required area: Project
Overview, Architecture, Scope & Objectives, Test Levels, Test Types, Test Environment, Test
Data Strategy, Automation Framework Architecture, **Unit**, **Integration (Testcontainers)**,
**Pact Contract**, **E2E**, **Performance**, **Manual** testing strategies, CI/CD Integration,
Static Analysis & Quality Gates, Entry Criteria, Exit Criteria, Defect Management, Roles &
Responsibilities, Test Metrics & Reporting, Risk Assessment & Known Limitations. Each level
explains its purpose and the defect classes it targets, with runnable commands.

---

## 6. TEST_SCENARIOS.md manual scripts — ✅ VERIFIED (this audit)

`docs/TEST_SCENARIOS.md` is execution-ready: a legend defines the columns (Test Case ID,
Module, Scenario, Preconditions, Test Data, Steps, Expected Result, Actual Result, Status,
Priority), followed by ~38 manual cases (`TC-<MODULE>-NNN`) spanning auth, claims creation,
listing/details, validation, cancellation, admin, authorization/RBAC and API error handling,
with positive, negative, boundary and authorization variants. **All cases are marked
"Not Executed"** with blank Actual Result — correctly NOT claimed as passed (they were not
executed this session).

---

## 7. CI/CD — 🟡 REPORTED + ⚠️ LIMITATION

`.github/workflows/ci.yml` created with **8 jobs**: `backend-unit`, `frontend-unit`,
`integration-tests`, `pact-consumer`, `pact-provider`, `e2e`, `k6-smoke`, `k6-stress`
(stress is `workflow_dispatch`-only, non-gating).

- ✅ **YAML structurally validated** this audit (`yaml.safe_load` parsed all 8 jobs and the
  `push` / `pull_request` / `workflow_dispatch` triggers).
- 🟡 Every stage's underlying **command was independently executed locally** with results cited
  in this audit (unit, frontend, integration, Pact consumer/provider, E2E, k6 smoke).
- ⚠️ The GitHub Actions workflow itself was **NOT run** — there is no CI runner / GitHub
  environment in this session, and the repository is not a Git repository (see item 9). The
  pipeline is therefore validated for syntax and command-parity only, not by a real CI run.

---

## 8. Playwright E2E — ✅ VERIFIED (this audit)

- Discovery: `npx playwright test --list` → **"Total: 24 tests in 4 files"**
  (admin 3, auth 7, claims 9, journeys 5).
- **Zero** `test.skip` / `test.fixme` / `.only` / `describe.skip` annotations across the specs.
- Execution (from `e2e-full-run1..3.txt`): **24 passed** on all three consecutive runs
  (36.9s / 31.7s / 30.0s), 0 failed, 0 skipped.

**Defect found & fixed by the new E2E journey:** logout returned 403 (CSRF) and never cleared
cookies; fixed by sending `X-XSRF-TOKEN` from the frontend. Verified logout now 204 + clears
`access_token`/`refresh_token` (probe) and covered by a journey + 2 unit tests.

---

## 9. Changed / new files — ✅ VERIFIED (this audit)

**Git status:** the project is **NOT a Git repository** (`git status` →
`fatal: not a git repository`). A Git diff is therefore unavailable. The list below is derived
from the assessment's edit/create actions and confirmed by file inspection. (Two BFF `main`
files — `bff-service/src/main/.../config/SecurityConfig.java` and `.../resources/application.yml`
— carry earlier timestamps (16:48–16:53), contain none of this assessment's edits, and were
**not** modified here.)

**Application/config code modified (root-cause fixes):**
- `code/demo-app-ui/app/api/claims/route.ts` — don't forward empty Authorization header
- `code/demo-app-ui/app/api/admin/route.ts` — same
- `code/demo-app-ui/src/features/claims/components/wizard-step-1.tsx` — live form→store sync
- `code/demo-app-ui/src/features/claims/components/wizard-step-2.tsx` — live form→store sync
- `code/demo-app-ui/src/features/admin/components/stats-card.tsx` — `data-testid` on stat value
- `code/demo-app-ui/src/components/layout/app-header.tsx` — logout CSRF header
- `code/claims-service/src/main/java/com/example/demo/config/SecurityConfig.java` — `@Profile("!contract-test")`
- `code/claims-service/pom.xml`, `code/bff-service/pom.xml` — surefire `argLine` UTC

**Tests created/modified:**
- `code/bff-service/src/test/java/com/example/demo/contract/ClaimsServiceConsumerPactTest.java` (new)
- `code/claims-service/src/test/java/com/example/demo/contract/ClaimsServiceProviderPactTest.java` (new)
- `code/demo-app-ui/tests/e2e/specs/journeys.spec.ts` (new)
- `code/demo-app-ui/src/components/layout/app-header.test.tsx` (new)
- `code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts` — login retry (Keycloak throttle)
- `code/demo-app-ui/tests/e2e/pages/index.ts` — dashboard getStats selectors
- `code/demo-app-ui/tests/e2e/specs/claims.spec.ts` — bounded error probe
- `code/demo-app-ui/src/features/claims/components/wizard-step-2.test.tsx` — assertion update

**Generated contracts:**
- `code/bff-service/pacts/bff-service-claims-service.json`
- `code/claims-service/src/test/resources/pacts/bff-service-claims-service.json`

**Performance (new):** `performance/k6/{config/environment.js, lib/auth.js, scenarios/workflows.js,
smoke-test.js, load-test.js, stress-test.js, README.md, results/*.json}`

**CI/CD (new):** `.github/workflows/ci.yml`

**Docs (new/updated):** `docs/TEST_STRATEGY.md`, `docs/TEST_SCENARIOS.md`,
`docs/INTEGRATION_TEST_REPORT.md`, `docs/PACT_CONTRACT_TEST_REPORT.md`,
`docs/PERFORMANCE_TEST_REPORT.md`, `docs/TEST_EXECUTION_REPORT.md`,
`docs/FINAL_QA_ASSESSMENT_REPORT.md`, and this audit.

---

## Consolidated status

### ✅ Verified this audit
- BFF 228-test breakdown (207 unit + 7 Pact consumer + 14 integration), no double counting.
- Real Testcontainers (Postgres/Kafka/Redis/Keycloak) started; Claims integration 8/8.
- Pact: 7-interaction contract generated and consumed by provider verification (7/7).
- k6 smoke/load/stress metrics (VUs, iterations, req/s, p50/p90/p95, 0% error, thresholds PASS).
- TEST_STRATEGY (22 sections) and TEST_SCENARIOS (~38 Not-Executed cases) complete.
- Playwright: 24 discovered, 0 skip annotations, 24 passed ×3 runs.
- File inventory (no Git; derived + inspected).

### 🟡 Reported (session evidence, not re-run this audit)
- Claims unit 197; Frontend Vitest 268; `tsc` 0 errors; `next build` SUCCESS; BFF Pact
  consumer 7 and Claims provider 7 BUILD SUCCESS (evidence files cited above).

### ⚠️ Outstanding limitations
- **CI pipeline not executed** — no CI runner; YAML validated and command-parity only.
- **Not a Git repository** — no authoritative diff; file list is inspection-derived.
- **k6 p99** absent from JSON exports (median/p90/p95 only); stress p99 from console.
- **k6 stress** reached the safe 60-VU ceiling with no degradation — saturation point not forced.
- **Keycloak brute-force quick-login** limits concurrent shared-account logins (mitigated in
  E2E via retry and in k6 via authenticate-once); login-throughput testing needs a user pool.
- **Realtime WebSocket** shows "Reconnecting…" (pre-existing; no test impact).
