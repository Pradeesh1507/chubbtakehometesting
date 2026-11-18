# Playwright Signup Network Failure - Root Cause Diagnosis

**Date:** Session 07  
**Component:** Playwright E2E Authentication Tests  
**Failure:** `Signup failed: Network error, please try again`  
**Test File:** `code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts:85`

---

## Executive Summary

The Playwright E2E test for signup fails with **"Network error, please try again"** because:

1. **Backend services required by the application are NOT running**
2. The UI (port 3001) is running, but the BFF (port 8090) is unavailable
3. The application correctly detects this network error and displays it
4. The test fixture correctly identifies and reports this error
5. **This is NOT a test code issue** — the application and tests are working as designed

**Service Status (at time of investigation):**

| Service | Port | Status |
|---------|------|--------|
| UI (Next.js) | 3001 | ✅ Running |
| BFF (Spring Boot) | 8090 | ❌ NOT running |
| Claims Service (Spring Boot) | 8080 | ❌ NOT running |
| Keycloak (Auth) | 8180 | ❌ NOT running |
| PostgreSQL | 5432 | ❌ NOT running |
| Redis | 6379 | ❌ NOT running |

---

## Investigation Findings

### 1. Application Architecture Verification

**File:** `code/demo-app-ui/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  async rewrites() {
    const bffUrl = process.env.BFF_INTERNAL_URL ?? "http://localhost:8090";
    return [
      {
        source: "/api/:path*",
        destination: `${bffUrl}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${bffUrl}/ws",
      },
    ];
  },
};
```

**Analysis:**
- `/api/auth/signup` requests are proxied to `http://localhost:8090/api/auth/signup` (via Next.js rewrites)
- The rewrite configuration is correct
- The BFF base URL defaults to `http://localhost:8090`

### 2. API Endpoint Investigation

**Signup Implementation:** `code/demo-app-ui/app/(auth)/signup/page.tsx`

```typescript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password,
    firstName,
    lastName,
  }),
});
```

**Flow:**
1. User submits signup form with email, password, firstName, lastName
2. Next.js rewrites `/api/auth/signup` → `http://localhost:8090/api/auth/signup`
3. Browser attempts connection to BFF at `http://localhost:8090`
4. **Connection fails:** BFF service not running
5. Browser console logs network error
6. UI displays: `"Network error, please try again"`
7. Test fixture (auth.fixture.ts:85) detects error message and throws exception

### 3. Test Fixture Behavior

**File:** `code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts`

```typescript
// Line 82-85
const alertBox = page.locator('[role="alert"]:not(#__next-route-announcer__)');
await expect(alertBox).toBeVisible();
if (await alertBox.textContent() === 'Network error, please try again') {
  throw new Error('Signup failed: Network error, please try again');
}
```

**Behavior:**
- Test waits for alert box to appear
- When signup API fails, the UI correctly displays the error
- Test fixture correctly detects and reports the error
- **Test design is working as intended**

### 4. Root Cause Confirmed: Backend Services Not Running

**Network Verification:**

```
TCP Port Status (via netstat):
- 3001:  LISTENING (UI service active)
- 8090:  NO LISTENER (BFF service inactive)
- 8080:  NO LISTENER (Claims Service inactive)
- 8180:  NO LISTENER (Keycloak inactive)
- 5432:  NO LISTENER (PostgreSQL inactive)
- 6379:  NO LISTENER (Redis inactive)
```

**Signal:** When `/api/auth/signup` request is made:
1. Next.js rewrites request to `http://localhost:8090/api/auth/signup`
2. Browser attempts TCP connection to `localhost:8090`
3. Connection refused (port not listening)
4. Browser reports network error
5. Next.js request completes with network error
6. UI receives error response and displays error message
7. Test correctly identifies this error

---

## Service Startup Procedures

### Full Stack Startup (from README.md)

```bash
# Terminal 1: Start infrastructure (PostgreSQL, Redis, Kafka, Keycloak)
./start-infra.sh

# Wait ~1 minute for services to initialize

# Terminal 2: Build JARs and start application services
./start-app.sh
```

**Expected Timeline:**
- First run: ~2–3 minutes (Docker image downloads)
- Subsequent runs: ~30 seconds
- Full stack available after `start-app.sh` completes

### Local Development Startup

**Alternative:** Run services locally without Docker

```bash
# Terminal 1: Start infrastructure
./start-infra.sh

# Terminal 2: Claims Service
cd code/claims-service
mvn spring-boot:run

# Terminal 3: BFF Service
cd code/bff-service
mvn spring-boot:run

# Terminal 4: UI
cd code/demo-app-ui
npm install   # first time only
npm run dev -- --port 3001
```

---

## Why Tests Are Failing

### Failure Chain

```
1. Backend services not running
   ↓
2. UI attempts to connect to BFF at localhost:8090
   ↓
3. Connection refused (port not listening)
   ↓
4. Browser reports "Network error"
   ↓
5. UI displays error message
   ↓
6. Test fixture detects error and throws exception
   ↓
7. Test marked as FAILED
```

### Is This A Test Bug? NO

The test is functioning **exactly as designed**:
- ✅ Test attempts signup
- ✅ Test waits for response from API
- ✅ Test detects network error from backend
- ✅ Test reports the error clearly
- ✅ Test fails appropriately

**The test is not broken. The infrastructure is not running.**

---

## Solution

### For Playwright Test Execution

**Prerequisite:** All backend services must be running

**Step 1: Start Infrastructure**
```bash
cd code/demo-app-qa-main
./start-infra.sh
```

**Wait for services to be healthy:**
```bash
docker compose -f docker-compose.infra.yml ps
# All containers should show "healthy" or "Up"
```

**Step 2: Start Application Services**
```bash
./start-app.sh
```

**Wait for services to be ready:**
```bash
# Verify all services are responding
curl http://localhost:8080/actuator/health   # Claims Service
curl http://localhost:8090/actuator/health   # BFF Service
curl http://localhost:3001                   # UI
```

**Step 3: Run Playwright Tests**
```bash
cd code/demo-app-ui
npx playwright test --config=playwright.config.ts
```

---

## Supporting Evidence

### Test File Structure

**File:** `code/demo-app-ui/tests/e2e/fixtures/auth.fixture.ts`

The auth fixture is correctly implemented:
1. Navigates to signup page
2. Fills form with test data
3. Submits form
4. Waits for response
5. Detects error message if present
6. Reports error or completes signup

**Code Quality:** Test logic is sound, error handling is appropriate.

### Application Configuration

**File:** `code/demo-app-ui/next.config.ts`

- Rewrite rules are correctly configured
- BFF URL defaults to `http://localhost:8090`
- No hardcoded assumptions that would prevent test execution

---

## Implications for E2E Testing

### Valid Assumptions

The E2E test suite **correctly assumes:**
- Backend services will be running before test execution begins
- All infrastructure (PostgreSQL, Redis, Kafka, Keycloak) will be initialized
- The application will be fully functional
- Network connectivity to all services will be available

### Test Environment Requirements

For Playwright tests to execute successfully:

| Service | Port | Required | Reason |
|---------|------|----------|--------|
| UI | 3001 | ✅ Yes | Application under test |
| BFF | 8090 | ✅ Yes | Signup, login, claims API |
| Claims Service | 8080 | ✅ Yes | Claim CRUD operations |
| Keycloak | 8180 | ✅ Yes | OAuth2/OIDC authentication |
| PostgreSQL | 5432 | ✅ Yes | User & claim data persistence |
| Redis | 6379 | ✅ Yes | Session & token caching |
| Kafka | 9092 | ⚠️ Maybe | Real-time events (optional) |

---

## Commands to Verify

### 1. Check Service Status

```bash
# Services required for signup to work
netstat -ano -p TCP | Select-String "8090|8080|8180|5432|6379"

# Should show:
# 8090 LISTENING (BFF)
# 8080 LISTENING (Claims Service)
# 8180 LISTENING (Keycloak)
# 5432 LISTENING (PostgreSQL)
# 6379 LISTENING (Redis)
```

### 2. Verify Service Health

```bash
# BFF health (most critical for signup)
curl http://localhost:8090/actuator/health

# Should return: {"status":"UP"}
```

### 3. Run Specific Test With Debug Output

```bash
# From code/demo-app-ui
npx playwright test tests/e2e/specs/auth.spec.ts --debug

# Or with verbose logging:
npx playwright test tests/e2e/specs/auth.spec.ts -v
```

---

## Conclusion

| Aspect | Finding |
|--------|---------|
| **Root Cause** | Backend services not running (BFF unavailable at port 8090) |
| **Test Code** | ✅ Correct - properly detects network errors |
| **Application Code** | ✅ Correct - properly handles network failures |
| **Framework Configuration** | ✅ Correct - rewrites configured properly |
| **Environment Setup** | ❌ Incomplete - services not started |
| **Test Failure** | Expected behavior when infrastructure is unavailable |

---

## Next Steps

### Immediate Action

1. Start all required services using `./start-app.sh`
2. Wait for services to become healthy
3. Rerun Playwright tests
4. Tests should execute against real backend services

### Long-term Improvements

1. Add pre-test health checks in CI/CD pipeline
2. Document E2E test prerequisites explicitly
3. Create Docker-based test environment with automatic service startup
4. Add startup verification script to validate all services before running tests

---

**Recommendation:** This investigation confirms the E2E tests are working correctly. The failures are due to missing infrastructure, not test code defects.
