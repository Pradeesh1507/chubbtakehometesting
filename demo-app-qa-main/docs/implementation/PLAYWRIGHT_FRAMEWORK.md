# Implementation Guide — Playwright E2E Framework

How the end-to-end suite is structured and run. For *results* see
[../TEST_EXECUTION_REPORT.md](../TEST_EXECUTION_REPORT.md); for *what/why* see
[../TEST_STRATEGY.md](../TEST_STRATEGY.md).

## Purpose
Validate real user journeys through the full stack (Browser → Next.js → BFF → Claims →
Postgres/Kafka) against the production UI build.

## Architecture (Page Object Model + fixtures)
```
code/demo-app-ui/tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts     # `test`/`expect` extended with an `auth` fixture
│   └── test-data.ts        # faker-based builders (users, claims)
├── pages/index.ts          # Page Objects: Login, Signup, Claims, Wizard, Admin*
├── specs/
│   ├── auth.spec.ts        # 7
│   ├── claims.spec.ts      # 9
│   ├── admin.spec.ts       # 3
│   └── journeys.spec.ts    # 5 (logout, dup signup, persistence, details, RBAC)
└── global-setup.ts
```
Total: **24 tests**, Chromium, `baseURL http://localhost:3101`.

## Key configuration (`playwright.config.ts`)
- `baseURL: http://localhost:3101`, `headless: true`, `fullyParallel: true`.
- `webServer.command: 'npm run build && npx next start -p 3101'` with
  `reuseExistingServer: true` — reuses an already-running prod server on 3101.
- Reporters: `html` (`playwright-report/`) + `junit` (`playwright-report/results.xml`).

## The auth fixture
- `createAndLoginUser()` — signup + login a fresh faker user.
- `loginUser(email, password)` — logs in; **retries on Keycloak's transient brute-force
  "quick login" 401** with jittered backoff (valid-credentials only). This keeps parallel
  admin tests (shared `admin@demo.com`) reliable without weakening assertions.

## Conventions
- Stable locators: `data-testid` (`wizard-step-1/2/3`, `view-details-button`,
  `claim-detail-modal`, `stat-value-*`, `login-error`) and role/text selectors.
- Auto-waiting (`waitForURL`, `waitFor({state:'visible'})`); bounded probes (count-guard before
  `textContent`) to avoid unbounded hangs on the success path.
- No forced clicks, no arbitrary sleeps to mask sync, no weakened assertions.

## Run
```powershell
# Ensure UI prod server is up on 3101 (reused by Playwright)
cd code\demo-app-ui ; npm run build ; npx next start -p 3101   # background shell
cd code\demo-app-ui ; npx playwright test            # run all 24
cd code\demo-app-ui ; npx playwright test --list     # discovery
cd code\demo-app-ui ; npx playwright test journeys.spec.ts --reporter=list
```

## Expected results
- Discovery: `Total: 24 tests in 4 files`.
- Execution: `24 passed`, 0 failed, 0 skipped — stable across 3 consecutive runs
  (~30–37s each).

## Troubleshooting
- **Admin login "Invalid email or password" under parallelism** → Keycloak quick-login throttle;
  handled by the fixture retry. If seen elsewhere, space logins or reduce workers.
- **`waitForURL` times out though URL matches** → a bounded diagnostic probe was hanging; use
  `count()` before `textContent()` (already applied in `claims.spec.ts`).
- **Port 3101 down** → Playwright will build+start its own server (slower); for fast iteration
  keep a persistent `next start -p 3101` running.
- **Logout didn't clear session** → the frontend must send `X-XSRF-TOKEN` (see app-header fix);
  covered by `journeys.spec.ts` + `app-header.test.tsx`.
