You are acting as a Senior QA Automation Engineer with expertise in Playwright, TypeScript, Next.js, Spring Boot, REST APIs and authentication testing.

## Project context

Application: Insurance Claims Management

Architecture:
- Frontend: Next.js 16 + React 19 — port 3001
- BFF: Spring Boot — port 8090
- Claims Service: Spring Boot — port 8080
- Keycloak: port 8180
- Database: PostgreSQL

Playwright framework:
- Location: `code/demo-app-ui/tests/e2e`
- Configuration: `code/demo-app-ui/playwright.config.ts`
- Page Objects, fixtures and test-data builders are already implemented.

## Current execution results

Command:
`npx playwright test --config=playwright.config.ts`

Results:
- 19 tests discovered
- 4 passed
- 12 failed
- 3 skipped
- Execution time: approximately 2.2 minutes

Failed authentication tests:
1. should allow user to sign up with valid credentials
2. should allow user to login with valid credentials
3. should reject login with invalid email/password

Failed claims tests:
1. should display claims page when logged in
2. should show empty state when no claims exist
3. should navigate to claim creation wizard from claims page
4. should create a claim with valid data
5. should validate required fields in claim form
6. should show validation error for empty description
7. should allow user to cancel claim creation
8. should allow user to navigate back in wizard
9. should handle claim creation network error gracefully

## Objective

Investigate the root causes and fix all legitimate E2E test failures without weakening the tests or changing application functionality unnecessarily.

## Phase 1: Failure analysis

Inspect:
- Playwright HTML report and `test-results` artifacts
- Error messages, call logs, screenshots and traces
- `global-setup.ts`
- Authentication fixtures
- Test data builders
- All three E2E spec files
- Page Object classes and locators
- `playwright.config.ts`
- Frontend authentication implementation
- BFF authentication endpoints
- Keycloak configuration and user provisioning
- Claims API endpoints and request/response structures

Identify whether failures are caused by:
- Incorrect locators or page assumptions
- Incorrect authentication flow
- User registration or login API failures
- Keycloak configuration
- Missing or invalid test data
- Backend service connectivity
- Incorrect API request payloads
- Timing or asynchronous UI behaviour
- Test isolation or parallel execution
- Incorrect expectations in test cases

Do not assume the root cause. Support each diagnosis with evidence.

## Phase 2: Implement fixes

Fix the root causes identified.

Requirements:
- Reuse existing Page Object Model.
- Keep authentication and test data fixtures reusable.
- Use reliable Playwright locators.
- Use web-first assertions and appropriate auto-waiting.
- Avoid arbitrary fixed sleeps.
- Ensure every test has independent test data.
- Avoid hardcoded users shared across parallel tests unless the application requires predefined accounts.
- Validate actual API contracts before constructing request payloads.
- Do not bypass authentication.
- Do not mock backend functionality for tests intended to validate real end-to-end journeys.
- Preserve negative test coverage.
- Do not mark failing tests as skipped.
- Do not remove assertions to obtain a green build.
- Do not modify production code unless a genuine application defect is discovered.

## Phase 3: Execute and validate

Run the complete E2E suite.

Command:
`npx playwright test --config=playwright.config.ts`

If tests fail:
- Inspect the new failure details.
- Correct the root cause.
- Rerun the affected test.
- Finally rerun the entire suite.

Also verify that the UI and backend services are available before execution.

## Phase 4: Documentation

Update:
- `docs/PLAYWRIGHT_E2E_REPORT.md`
- `.claude/ai-journal.md`

Include:
1. Original 12 failures and their root causes.
2. Files modified.
3. Fixes implemented.
4. Test execution commands.
5. Final passed, failed and skipped counts.
6. Remaining limitations.
7. Screenshots or trace locations where useful.

## Final acceptance criteria

- All legitimate E2E tests execute against the real application.
- No Vitest tests are accidentally discovered by Playwright.
- No tests are artificially skipped or weakened.
- Test data is isolated.
- Authentication and claims journeys are verified.
- Actual execution results are documented.

Do not claim success based only on test discovery or TypeScript compilation.

Continue until all feasible fixes and validation are complete. If a failure depends on unavailable infrastructure or missing application functionality, explain the blocker instead of hiding it.

At the end, provide a concise summary of root causes, code changes and actual test results.