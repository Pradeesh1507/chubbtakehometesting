# Playwright E2E Test Framework for Demo App UI

## Overview

This directory contains end-to-end (E2E) tests for the Insurance Claims Management demo application UI using Playwright with TypeScript.

## Structure

```
tests/e2e/
├── global-setup.ts          # Global setup/teardown for all tests
├── fixtures/
│   ├── auth.fixture.ts      # Authentication fixture (login, signup)
│   └── test-data.ts         # Test data builders (Faker-based)
├── pages/
│   └── index.ts             # Page Object Models (LoginPage, ClaimsPage, etc.)
└── specs/
    ├── auth.spec.ts         # Authentication tests
    ├── claims.spec.ts       # Claims management tests
    └── admin.spec.ts        # Admin-specific tests
```

## Prerequisites

The E2E tests require the entire demo application stack to be running:

1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Cache (port 6379)
3. **Kafka** - Event streaming (port 9092)
4. **Keycloak** - Auth server (port 8180)
5. **Claims Service** - Backend (port 8080)
6. **BFF Service** - API layer (port 8090)
7. **UI** - Next.js frontend (port 3001)

### Starting the Full Stack

From the project root:

```bash
# Start infrastructure (PostgreSQL, Redis, Kafka, Keycloak)
./start-infra.sh

# In another terminal, start the application services
./start-app.sh
```

This starts all services including the UI on `http://localhost:3001`.

### Verify All Services

After ~30-60 seconds, verify all services are healthy:

```bash
# Check UI
curl http://localhost:3001

# Check BFF
curl http://localhost:8090/actuator/health

# Check Claims Service
curl http://localhost:8080/actuator/health

# Check Keycloak
curl http://localhost:8180/auth/health
```

## Configuration

**File:** `playwright.config.ts`

Key settings:
- **baseURL:** `http://localhost:3001`
- **timeout:** 30 seconds per test
- **retries:** 1 in CI, 0 locally
- **workers:** 1 in CI (for stability), unlimited locally
- **webServer:** Auto-starts UI on port 3001 (if not already running)
- **browser:** Chromium (Firefox added in CI)
- **trace:** On first retry (failure debugging)
- **screenshot:** On failure

## Test Scenarios

### Authentication Tests (`auth.spec.ts`)

1. **Sign Up** - User registration with valid data
2. **Sign Up Validation** - Invalid email and weak password validation
3. **Login** - User login with valid credentials
4. **Login Failure** - Rejection with invalid credentials
5. **Navigation** - Sign up and login page linking

### Claims Tests (`claims.spec.ts`)

1. **Dashboard** - Display claims page when logged in
2. **Empty State** - Show empty message for new users
3. **Wizard Navigation** - Navigate to claim creation
4. **Full Journey** - Create claim through all 3 wizard steps
5. **Validation** - Required field validation
6. **Specific Validation** - Empty description error
7. **Cancellation** - Cancel claim with confirmation
8. **Back Navigation** - Navigate backward in wizard
9. **Error Handling** - Graceful network error handling

### Admin Tests (`admin.spec.ts`)

> Currently skipped — requires admin user seeding

Planned scenarios:
1. **Admin Dashboard** - View statistics
2. **Claims Management** - View and filter claims
3. **Status Update** - Update claim status and verification

## Fixtures

### Auth Fixture (`tests/e2e/fixtures/auth.fixture.ts`)

Provides authentication helpers:

```typescript
test('example', async ({ page, auth }) => {
  // Create new user and auto-login
  const user = await auth.createAndLoginUser();
  
  // Or login existing user
  await auth.loginUser('test@example.com', 'password');
  
  // Or logout
  await auth.logout();
  
  // Or get test user without creating
  const testUser = auth.getTestUser();
});
```

## Page Object Models

### Available Pages

- **LoginPage** - Login form, error handling
- **SignupPage** - User registration form
- **ClaimsPage** - Claims listing and navigation
- **ClaimWizardPage** - Multi-step claim creation form
- **AdminDashboardPage** - Admin statistics view
- **AdminClaimsPage** - Admin claim management

### Example Usage

```typescript
import { LoginPage } from '../pages/index';

test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
  
  const errorMsg = await loginPage.getErrorMessage();
  if (errorMsg) {
    console.log('Error:', errorMsg);
  }
});
```

## Test Data Builders

### Building Valid Data

```typescript
import { buildClaimData, buildTestUser } from '../fixtures/test-data';

const claim = buildClaimData();
// {
//   incidentDate: "2024-11-15",
//   description: "Lorem ipsum...",
//   ...
// }

const user = buildTestUser({ role: 'admin' });
// { name: "John Doe", email: "john@example.com", password: "...", role: "admin" }
```

### Building Invalid Data

```typescript
const invalidEmail = buildInvalidUserData('invalidEmail');
const weakPassword = buildInvalidUserData('weakPassword');
const noDescription = buildInvalidClaimData('emptyDescription');
```

## Running Tests

### List All Tests

```bash
npx playwright test --list
```

### Run All Tests

```bash
npx playwright test
```

### Run Specific Suite

```bash
npx playwright test auth.spec
npx playwright test claims.spec
npx playwright test admin.spec
```

### Run Specific Test

```bash
npx playwright test -g "should allow user to sign up"
```

### Run with Debug Mode

```bash
npx playwright test --debug
```

### Run with Headed Browser (see actions)

```bash
npx playwright test --headed
```

### Run with Traces (for debugging)

```bash
npx playwright test --trace on
```

## Viewing Test Reports

After tests complete:

```bash
# Open HTML report
npx playwright show-report
```

Report includes:
- Test results (passed/failed/skipped)
- Execution timeline
- Screenshots on failure
- Video recordings (if configured)
- Traces for debugging

## Best Practices

### 1. Data Isolation

Each test creates its own user via signup to avoid conflicts in parallel runs:

```typescript
const user = await auth.createAndLoginUser();
// Unique email via Faker
```

### 2. Waiting for Navigation

Always wait for expected URL/element:

```typescript
await loginPage.login(email, password);
await page.waitForURL('/claims'); // Don't assume instant redirect
```

### 3. Explicit Waits Over Timeouts

```typescript
// Good
await page.waitForSelector('[data-testid="claim-row"]');

// Avoid
await page.waitForTimeout(5000); // Hard to debug when it fails
```

### 4. Use Page Object Models

Encapsulate selectors and actions:

```typescript
// Good
await claimsPage.clickViewDetails(claimId);

// Avoid
await page.click(`[data-testid="claim-${claimId}"] button`);
```

### 5. Semantic Locators

Use accessible attributes:

```typescript
// Good
page.locator('button:has-text("Submit")');
page.locator('[role="alert"]');
page.locator('input[id="email"]');

// Avoid
page.locator('.btn.primary.submit');  // Brittle CSS
page.locator('xpath=//*[@class="..."]'); // Hard to maintain
```

## Troubleshooting

### "Cannot find module" or "Global setup not found"

Ensure `tests/e2e/global-setup.ts` exists and playwright.config.ts points to it.

### Tests hang or timeout

- Check if all services are running (`./start-app.sh`)
- Verify baseURL is correct (http://localhost:3001)
- Check browser availability: `npx playwright install chromium`

### Flaky tests

- Increase `timeout` in playwright.config.ts
- Use explicit waits instead of fixed delays
- Ensure test data is unique (Faker handles this)

### Login/Auth issues

- Verify test user credentials are correct
- Check if signup flow works manually
- Ensure cookies are accepted (credentials: 'include')

### Selector not found

- Use Playwright Inspector: `npx playwright test --debug`
- Take screenshots in test: `await page.screenshot()`
- Check element is not hidden or inside iframe

## Integration with CI/CD

The configuration automatically adjusts for CI environments:

```typescript
forbidOnly: !!process.env.CI,      // No test.only() in CI
retries: process.env.CI ? 1 : 0,  // Retry flaky tests in CI
workers: process.env.CI ? 1 : undefined, // Serial in CI for stability
```

Set `CI=true` before running in CI/CD pipelines.

## Maintenance

### Adding New Tests

1. Create new test file in `tests/e2e/specs/`
2. Import fixtures: `import { test, expect } from '../fixtures/auth.fixture'`
3. Use page objects for UI interactions
4. Use builders for test data
5. Add meaningful test descriptions
6. Run locally: `npx playwright test tests/e2e/specs/yourfile.spec.ts`

### Updating Selectors

When UI changes:

1. Update selectors in Page Object Models (`tests/e2e/pages/index.ts`)
2. Verify with Playwright Inspector: `npx playwright test --debug`
3. Run affected tests to verify fix
4. Commit both UI and test changes together

### Skipping Tests

Temporarily skip during development:

```typescript
test.skip('work in progress', async ({ page, auth }) => {
  // ...
});

// Or skip entire suite:
test.describe.skip('Admin tests', () => {
  // All tests in this suite will skip
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
