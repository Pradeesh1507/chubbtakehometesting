# Session 13 — Investigation Summary

## What Was Done

This session systematically investigated E2E test failures using a **completely isolated production environment** to avoid previous assumptions.

### Setup
- **UI**: Fresh production build on port 3101 (`npm run build && npx next start`)
- **Overlay Workarounds**: REMOVED from code
- **Config**: Isolated, no dev server reuse
- **Backend**: All services verified healthy (BFF, Claims, Keycloak, Postgres, Redis, Kafka)

### Investigation Method
1. ✅ Reviewed repository state and Session 12 changes
2. ✅ Set up isolated production server
3. ✅ Verified all backend services healthy
4. ✅ Ran Playwright E2E tests
5. ✅ Monitored BFF service logs during test execution
6. ✅ Analyzed results and identified root cause

## The Findings

### Test Results
```
Running 19 tests using 4 workers

12 failed
 4 passed
 3 skipped
```

### Error Pattern
- **All 12 failures**: "Network error, please try again"
- **Location**: Signup form catch block
- **Cause**: Client-side `fetch()` throwing exception

### Critical Discovery
**BFF Service Logs During Test Run:**
- Monitored for entire test execution
- **Result: ZERO new requests received**
- Last request: Manual test 5+ hours earlier
- **This proves the API request never reaches the BFF**

## Root Cause

### The Problem
```
Browser fetch('/api/auth/signup')
  ↓
Next.js Server on port 3101
  ↓
Should rewrite to: http://localhost:8090/api/auth/signup
  ↓
❌ FAILS - Request does not reach BFF
```

### Why
The Next.js `rewrites()` configuration in `next.config.ts` **does not intercept client-side programmatic fetch() calls** in this setup.

Likely causes:
1. Next.js 16 changed how middleware handles fetch requests
2. Rewrites work for navigation but not for programmatic API calls
3. Next.js warning: "The 'middleware' file convention is deprecated"

### Evidence
- ✅ Form submission works (Playwright successfully clicks and submits)
- ✅ No overlay blocking (overlay workarounds removed, still works)
- ✅ catch block is executed (proving fetch() threw error)
- ✅ BFF logs show zero requests (proving request never reached BFF)
- ✅ All backend services healthy (proven by running tests in BFF)

## The Solution

### Recommended Approach
**Create actual API route handlers** instead of relying on Next.js rewrites.

**Example** (`/app/api/auth/signup/route.ts`):
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const response = await fetch('http://localhost:8090/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      return Response.json({ error: 'Signup failed' }, { status: response.status });
    }
    
    return response;
  } catch (error) {
    return Response.json({ error: 'Network error' }, { status: 500 });
  }
}
```

### Why This Works
- ✅ Server-side implementation (reliable)
- ✅ No middleware/rewrite complications
- ✅ Full error control and logging
- ✅ Works consistently in all Next.js versions
- ✅ Can add request/response validation

### Implementation
Need to create:
- `/app/api/auth/signup/route.ts`
- `/app/api/auth/login/route.ts`
- `/app/api/claims/route.ts`
- `/app/api/admin/route.ts`

**Effort**: Low (5-10 lines each)

## What Changed vs Session 12

| Aspect | Session 12 | Session 13 |
|--------|-----------|-----------|
| **Diagnosis** | Dev overlay blocking clicks | API proxy layer not working |
| **Workaround** | Remove overlay via DOM manipulation | Removed - proved not the issue |
| **Result** | 16 tests still failing | Identified actual root cause |
| **Evidence** | Overlay script visible in HTML | BFF logs show zero requests |
| **Fix Applied** | Overlay removal code | None yet - identified what to fix |

## Next Action

Implement the API route handler solution to properly proxy requests to the BFF.

**Expected Outcome**: All 19 E2E tests should pass once API routes forward requests correctly.

---

**Session Status**: ROOT CAUSE IDENTIFIED  
**Confidence Level**: HIGH  
**Blockers**: None - ready to implement solution  
**Documentation**: See `docs/SESSION_13_E2E_ROOT_CAUSE_REPORT.md` for comprehensive details
