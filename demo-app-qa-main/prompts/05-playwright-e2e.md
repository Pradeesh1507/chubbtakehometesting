# QA-005 — Playwright E2E

- **Prompt ID:** QA-005
- **Name:** Playwright E2E framework & user journeys
- **Version:** 1.0
- **Status:** ACTIVE. Consolidated from archived originals
  `prompts/archive/07_Playwright_Setup.md` and `prompts/archive/Fix_Playwright_Script.md`,
  extended with the Part-2 journey-expansion work.
- **Execution status:** Executed — **24/24 passing** across 3 consecutive runs. See
  `docs/implementation/PLAYWRIGHT_FRAMEWORK.md`, `docs/TEST_EXECUTION_REPORT.md`.

## Objective
Maintain a stable Page-Object E2E suite covering the main user journeys, run against the
production UI on port 3101.

## Context & prerequisites
- `code/demo-app-ui`, Playwright 1.65, Chromium, `baseURL http://localhost:3101`.
- Full stack running; UI built and started on 3101 (`reuseExistingServer:true`).
- Read `docs/implementation/PLAYWRIGHT_FRAMEWORK.md`. Inspect real selectors/routes first.

## Reusable prompt text
```
Act as a Senior QA Automation Engineer (Playwright/TypeScript/Next.js) for code/demo-app-ui.

Inspect the real app before changing anything (pages, API routes, auth, selectors). Maintain the
Page Object Model and reusable auth fixtures. Cover main journeys: signup (valid/duplicate),
login (valid/invalid), logout + route protection, claim creation (valid, required-field &
boundary validation), cancel/discard, view claim details, claim persistence after reload, admin
dashboard + stats, claims management/status, and role-based access restrictions.

Rules: stable locators (data-testid/role), proper auto-waiting, unique test data, useful failure
diagnostics. No forced clicks, no arbitrary fixed waits to mask sync, no weakened assertions, no
skipped tests, no fake success. Run `--list` then the suite; run the full suite 3× for stability;
record ACTUAL results. Fix test-code issues; if the APP blocks a journey, fix the root cause in
app code (do not mask) or document it.
```

## Execution steps
1. `npx playwright test --list` (confirm discovery, zero skips).
2. Ensure UI prod server on 3101; `npx playwright test`.
3. Repeat full suite 3× for stability.

## Verification
- Discovery `Total: 24 tests in 4 files`; 24 passed ×3; 0 skipped.

## Related files
- `code/demo-app-ui/tests/e2e/{fixtures,pages,specs}/**`, `playwright.config.ts`
- `code/demo-app-ui/e2e-full-run{1,2,3}.txt`
- Archived originals: `prompts/archive/07_Playwright_Setup.md`, `Fix_Playwright_Script.md`
