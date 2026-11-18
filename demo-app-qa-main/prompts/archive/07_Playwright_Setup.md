Act as a Senior QA Automation Engineer specializing in Playwright, TypeScript and Next.js.

Project: `code/demo-app-ui`

The project already has:
- Playwright configuration: `playwright.config.ts`
- Existing frontend unit tests using Vitest.
- Test fixtures: `fixtures/seedUser.ts` and `fixtures/userFactory.ts`
- Next.js application with login, signup, claims, dashboard, admin claims and users pages.

## Current issue

Running:

`npx playwright test --list`

fails with:

`Cannot find module './tests/e2e/global-setup.ts'`

The configured global setup file is missing.

Playwright version: 1.65.1.

## Objective

Inspect and complete the existing Playwright framework. Implement meaningful E2E tests for the main insurance claims user journeys.

### 1. Inspect before changing

Inspect:
- package.json
- playwright.config.ts
- Existing tests and fixtures
- Login and signup pages
- Claims listing and claim creation pages
- Admin claims and status update functionality
- API routes and authentication flow
- Application startup scripts and environment configuration

Do not guess selectors, routes, request payloads, or authentication behaviour.

### 2. Fix Playwright infrastructure

- Resolve the missing global-setup.ts reference.
- Implement global setup only if it is genuinely required.
- If unnecessary, simplify the configuration and remove the invalid reference.
- Configure Chromium.
- Configure baseURL and appropriate timeouts.
- Configure screenshots and traces on failure.
- Use stable test isolation.
- Ensure Playwright and @playwright/test dependencies are correctly configured.
- Keep Vitest and Playwright configurations separate.

### 3. Implement E2E journeys

Implement the following tests based on actual application behaviour:

1. Login using valid claimant credentials.
2. Verify successful login and dashboard navigation.
3. Login failure with invalid credentials.
4. Create a new claim with valid data.
5. Verify the created claim in the claims listing.
6. Verify required-field validation when creating a claim.
7. Admin login and claim status update, if supported by the actual application workflow.
8. Verify updated claim status.

Use unique test data to avoid collisions.

Use role-based and accessible locators where possible. Avoid brittle XPath and unnecessary hardcoded waits.

### 4. Framework design

Use:
- TypeScript
- Playwright Test
- Page Object Model where it improves maintainability
- Reusable fixtures for authentication where appropriate
- Clear separation between page objects, test specs and test data.

Suggested structure:

tests/e2e/
  global-setup.ts (only if required)
  fixtures/
  pages/
  specs/
  test-data/

Do not duplicate existing fixtures without a reason.

### 5. Execution

First ensure the test discovery command works:

`npx playwright test --list`

Then execute the E2E tests.

If the application requires backend services, identify the required startup commands from the existing README and scripts.

Do not silently skip tests or replace real assertions with placeholder assertions.

Fix failures caused by the test framework or test code. If the application itself prevents a journey from succeeding, document the actual blocker rather than masking it.

### 6. Documentation

Create:
`docs/PLAYWRIGHT_E2E_REPORT.md`

Include:
- Framework structure
- Configuration decisions
- Test scenarios
- Execution commands
- Actual test results
- Failures and limitations
- Screenshots/traces evidence locations

Save the complete implementation prompt in `prompts/` and update `.claude/ai-journal.md` with the session.

### Constraints

- Do not modify application business logic just to make E2E tests pass.
- Do not break existing Vitest tests.
- Do not create fake global setup or empty test files just to make discovery pass.
- Do not claim tests passed unless they were actually executed.
- Preserve existing repository structure.

### Final response

Summarize:
1. Files created and modified.
2. Playwright configuration fixes.
3. E2E scenarios implemented.
4. Actual test execution results.
5. Exact commands to run the tests.
6. Remaining blockers.