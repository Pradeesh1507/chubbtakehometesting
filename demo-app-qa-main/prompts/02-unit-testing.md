# QA-002 — Unit Testing (Backend & Frontend)

- **Prompt ID:** QA-002
- **Name:** Fix & extend unit tests
- **Version:** 1.0
- **Status:** ACTIVE. Consolidated from archived originals
  `prompts/archive/02_claims_service_baseline.md`, `03_Fix_claims_service.md`,
  `04_investigate_remaining_test_failure.md`, `05_fix_failures.md`, `06_Clain_Final_Fix`.
- **Execution status:** Executed — Claims unit **197**, BFF unit + **7** Pact consumer,
  Frontend Vitest **268** (see `docs/TEST_EXECUTION_REPORT.md`).

## Objective
Keep all existing unit tests green and add meaningful coverage (especially regressions for
fixed defects), without inflating counts.

## Context & prerequisites
- Backend: JUnit 5 + Mockito + AssertJ; `mvn test` (integration excluded by default).
- Frontend: Vitest + Testing Library; `npm run test`.
- Read `docs/PROJECT_CONTEXT.md`. Preserve passing tests and assertions.

## Reusable prompt text
```
Act as an SDET. For the Insurance Claims demo:
1. Run the existing unit suites and record the baseline (Claims `mvn test`, BFF `mvn test`,
   UI `npm run test`).
2. Identify missing meaningful coverage (validation, service logic, exception handling, status
   transitions, edge cases; frontend components/hooks/stores/forms, error & loading states).
3. Add focused tests — prefer regression tests for fixed bugs. Do NOT add trivial/duplicate
   tests to inflate counts.
4. Re-run the suites; report exact counts.

Rules: do not weaken/skip/delete tests; do not change business behaviour to satisfy tests;
record ACTUAL results only.
```

## Execution steps
1. Baseline each suite; capture counts from surefire XML / Vitest output.
2. Add tests in the existing test files/structure; run the narrowest command first.
3. Re-run full suites; confirm no regressions.

## Verification
- Claims 197; BFF unit + consumer green; Vitest 268; `tsc --noEmit` 0 errors; `npm run build` OK.

## Related files
- `code/*/src/test/**`, `code/demo-app-ui/src/**/*.test.tsx`, `tests/setup.ts`
- `docs/archive/CLAIMS_SERVICE_*`, `docs/archive/VITEST_FAILURES_FIXED.md`
- Archived originals: `prompts/archive/02_*`…`06_Clain_Final_Fix`
