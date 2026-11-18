# Playwright E2E Signup Network Failure – Diagnosis Summary

## Finding

The Playwright E2E test `should allow user to sign up with valid credentials` fails with:

```
Signup failed: Network error, please try again
```

**Root Cause:** Backend infrastructure services required by the application are **NOT running**.

---

## Service Status

| Service | Port | Status | Type |
|---------|------|--------|------|
| UI (Next.js) | 3001 | ✅ Running | Application under test |
| BFF (Spring Boot) | 8090 | ❌ **NOT RUNNING** | Required for signup API |
| Claims Service | 8080 | ❌ NOT RUNNING | Required for claims operations |
| Keycloak | 8180 | ❌ NOT RUNNING | Required for authentication |
| PostgreSQL | 5432 | ❌ NOT RUNNING | Required for data persistence |
| Redis | 6379 | ❌ NOT RUNNING | Required for session management |

---

## What's Happening

```
1. Test runs signup via UI (port 3001) ✅
   ↓
2. Signup form calls: fetch('/api/auth/signup')
   ↓
3. Next.js rewrites to: http://localhost:8090/api/auth/signup
   ↓
4. Browser attempts connection to port 8090
   ↓
5. Connection REFUSED (port not listening) ← BFF NOT RUNNING
   ↓
6. Network error propagates to UI
   ↓
7. UI displays error: "Network error, please try again"
   ↓
8. Test fixture correctly detects error and fails test
```

---

## This Is NOT a Test Bug

| Component | Assessment |
|-----------|------------|
| **Test Code** | ✅ Correct - properly detects and reports network errors |
| **Application Code** | ✅ Correct - properly handles and displays errors |
| **Framework Configuration** | ✅ Correct - rewrites configured properly |
| **Environment** | ❌ Incomplete - services not started |

The test is **working as designed**. It fails because the infrastructure it's testing against is unavailable.

---

## Solution

### Start All Required Services

**From the `code/demo-app-qa-main/` directory:**

```bash
# Terminal 1: Start infrastructure
./start-infra.sh

# Wait for services to initialize (1-2 minutes)

# Terminal 2: Start application and services
./start-app.sh

# Wait for all services to be healthy (30 seconds - 1 minute)
```

### Verify Services Are Running

```bash
# Check ports are listening
netstat -ano -p TCP | Select-String "8090"

# Should show: 8090 LISTENING

# Verify BFF is responding
curl http://localhost:8090/actuator/health

# Should return: {"status":"UP"}
```

### Run Playwright Tests

```bash
cd code/demo-app-ui
npx playwright test --config=playwright.config.ts
```

**Expected result:** Tests will execute against the real application.

---

## Documentation

Full investigation saved to:
- **`docs/PLAYWRIGHT_SIGNUP_NETWORK_FAILURE_DIAGNOSIS.md`** - Complete analysis with service status, configuration review, and troubleshooting steps

---

## Key Insights

1. **The test is not broken** - it correctly identifies when the backend is unavailable
2. **The application is not broken** - it correctly handles network errors
3. **The environment is incomplete** - required services have not been started
4. **This is expected behavior** - E2E tests require the full application stack to run

Once services are running, the E2E tests will validate the complete signup, login, and claims user journeys against the real application.
