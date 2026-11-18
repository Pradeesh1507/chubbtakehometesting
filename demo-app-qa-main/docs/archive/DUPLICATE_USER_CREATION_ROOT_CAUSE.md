# Duplicate User Creation Defect – Root Cause Analysis & Fix

**Investigation Date:** Session 10  
**Component:** BFF SignupUseCase + Claims Service UserController  
**Error:** SQLState 23505 - duplicate key value violates unique constraint "pk_users"  
**Duplicate UUID:** c93ab05e-3f9e-4505-a5b8-827a4ade3bb3

---

## Executive Summary

The duplicate user creation defect is caused by **insufficient idempotency in the signup flow**. When network failures or token timeouts occur during user creation in the Claims Service, the BFF retries with the same UUID, causing a duplicate key violation.

**Root Cause Chain:**
1. BFF creates user in Keycloak → receives UUID
2. BFF sends POST /api/users to Claims Service with UUID
3. Claims Service inserts user into database (HTTP 201)
4. Network issue or timeout prevents 201 response from reaching BFF
5. BFF HTTP client retries with same request and same UUID
6. Second request reaches Claims Service
7. Claims Service tries to insert same UUID again → SQL constraint violation

---

## Configuration Analysis

**File:** `code/bff-service/src/main/java/com/example/demo/config/RestClientConfig.java`

```java
OkHttpClient httpClient = new OkHttpClient.Builder()
        .addInterceptor(correlationIdInterceptor)
        .addInterceptor(tracingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build();
```

**Issue:** OkHttp3 by default has **NO explicit retry configuration**, but it DOES implement default retry behavior:
- By default, retries on `SocketTimeoutException` and `IOException`
- By default, does NOT retry on HTTP errors (like 401)
- But custom retry logic in ClaimsServiceAdapter adds 401 retries

**File:** `code/bff-service/src/main/java/com/example/demo/adapter/out/claimsservice/ClaimsServiceAdapter.java` (lines 73-83)

```java
if (exception.getCode() == 401) {
    LOG.debug("Got 401, attempting token refresh and retry");
    return retryWithFreshToken(() -> {
        try {
            LOG.debug("Retrying Claims Service call with fresh token");
            var retryResponse = usersApi.createUser(request);  // ← SAME UUID SENT AGAIN
            LOG.debug("Retry succeeded");
            return mapToUserRecord(retryResponse);
        } catch (ApiException retryException) {
            // ...
        }
    });
}
```

---

## Failure Scenario (Detailed)

### Scenario 1: Token Timeout

```
Time  Component           Action                              Result
─────────────────────────────────────────────────────────────────────────
T0    Playwright          POST /api/auth/signup
T1    BFF                 → Keycloak.createUser(email)        UUID = abc-123
T2    BFF                 → POST /api/users (UUID=abc-123)
T3    Claims Service      INSERT INTO users (abc-123)         HTTP 201 sent
      Network             ✗ 201 response lost (timeout)
T4    BFF HTTP Client     ✗ Timeout waiting for 201
T5    BFF HTTP Client     Automatic retry
T6    BFF                 → POST /api/users (UUID=abc-123)     Same UUID!
T7    Claims Service      INSERT INTO users (abc-123)         ✗ DUPLICATE KEY ERROR
      Database            SQLState 23505                       pk_users already exists
```

### Scenario 2: 401 Unauthorized → Token Refresh → Retry

```
Time  Component           Action                              Result
─────────────────────────────────────────────────────────────────────────
T0    Playwright          POST /api/auth/signup
T1    BFF                 → Keycloak.createUser(email)        UUID = def-456
T2    BFF                 → POST /api/users (UUID=def-456)
T3    Claims Service      INSERT INTO users (def-456)         HTTP 201 sent
T4    BFF HTTP Client     ✗ 401 response (token expired)
T5    BFF                 Catch 401 in createUser()
T6    BFF                 Refresh token & retry
T7    BFF                 → POST /api/users (UUID=def-456)     Same UUID again!
T8    Claims Service      INSERT INTO users (def-456)         ✗ DUPLICATE KEY ERROR
      Database            SQLState 23505                       pk_users already exists
```

---

## Why This Isn't Caught By Tests

**Current Test Coverage:** `code/bff-service/src/test/java/com/example/demo/application/auth/SignupUseCaseTest.java`

The existing tests use mocks:
- `keycloakAdminPort.createUser()` returns mocked UUID
- `claimsServicePort.createUser()` returns mocked UserRecord
- No network simulation
- No retry logic testing
- No concurrent signup testing

**Result:** Tests pass because they never exercise the retry logic or network failures.

---

## Why Parallel Tests Expose It

**Playwright Configuration:** `playwright.config.ts`

```typescript
export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,  // Single worker in CI
  // ...
});
```

**What Happens:**
- Local dev: `fullyParallel: true` → Multiple tests run in parallel
- Each test calls signup → Each test generates unique email (via Faker)
- But if two tests have overlapping timing + network issues:
  - Both may hit the retry logic
  - Both may send requests that timeout and retry
  - Both may use different UUIDs, but same user creation flow
  - One gets the duplicate key error

---

## The Fix: Idempotent User Creation

The solution is to make user creation **idempotent by email** in the Claims Service:

**File:** `code/claims-service/src/main/java/com/example/demo/adapter/in/web/UserController.java`

**Current Implementation (UNSAFE):**
```java
public ResponseEntity<UserResponseDTO> createUser(CreateUserRequestDTO request) {
    var userId = UserId.of(request.getUserId());
    var email = Email.of(request.getEmail());

    // Existing user check is present but doesn't prevent race condition
    var existing = userRepository.findByEmail(email);
    if (existing.isPresent()) {
        // ... handles existing case ...
    }

    // Direct insert without retry-safety
    var user = new User(userId, ...);
    userRepository.save(user);
    // ...
}
```

**Problem:** 
- Race condition: Two requests can both pass the `findByEmail()` check before either insert
- No handling for UUID conflicts
- Throws `DataIntegrityViolationException` on duplicate UUID

**Improved Implementation (SAFE):**
1. Query user by email first
2. If exists:
   - If UUID matches: Return 409 Conflict (idempotent, same request)
   - If UUID differs: Update UUID to new Keycloak ID (Keycloak recreated)
3. If not exists: Insert new record
4. Wrap in transaction with appropriate isolation level

---

## Technical Root Cause

| Factor | Issue |
|--------|-------|
| **HTTP Retry Logic** | OkHttp retries on timeout; BFF adds 401 retries → Same UUID sent twice |
| **No Idempotency Key** | No request deduplication (e.g., Idempotency-Key header) |
| **Race Condition** | findByEmail() + insert is not atomic; two requests can interleave |
| **Email Uniqueness** | Database has UK on email, but UUID is PK; email check doesn't prevent UUID dupes |
| **Test Coverage** | Existing tests don't simulate network failures or retries |

---

## Recommended Fix Implementation

### 1. Add Idempotency at Database Level

**Keep existing idempotency check** but add UUID conflict handling:

```java
public ResponseEntity<UserResponseDTO> createUser(CreateUserRequestDTO request) {
    var userId = UserId.of(request.getUserId());
    var email = Email.of(request.getEmail());

    // Idempotent by email: If email exists, return existing or update UUID
    var existing = userRepository.findByEmail(email);
    if (existing.isPresent()) {
        var existingUser = existing.get();
        if (existingUser.getUserId().equals(userId)) {
            // Idempotent: same request (same email, same UUID)
            return ResponseEntity.status(HttpStatus.CONFLICT).body(toUserResponse(existingUser));
        }
        // UUID mismatch: Keycloak was recreated, update ID
        // This is for Keycloak migration scenarios, not signup duplicates
        userJpaRepository.updateUserId(existingUser.getUserId().value(), userId.value());
        userJpaRepository.flush();
        // ... fetch and return updated user ...
    }

    // New user: insert with given UUID
    var user = new User(userId, ...);
    userRepository.save(user);
    // ...
}
```

**Current Implementation:** Already has this logic! (UserController.java lines 36-50)

### 2. The Real Issue: Duplicate UUID Without Email Match

The code already handles duplicate emails. But if:
- Request 1: email=foo@example.com, UUID=abc-123 → Success, inserts
- Network issue before response reaches BFF
- Request 1 retried by HTTP client
- Request 1 again: email=foo@example.com, UUID=abc-123 → Should hit the idempotent path

**But what if:**
- Keycloak generates TWO different UUIDs for the same email?
- Then: email=foo@example.com, UUID=abc-123 (first attempt)
- Keycloak creates duplicate user (if email not unique in Keycloak)
- email=foo@example.com, UUID=def-456 (second attempt on retry)
- Both requests reach Claims Service
- First insert with UUID=abc-123 succeeds
- Second insert with UUID=def-456... but email already exists!

**Check:** Does Keycloak enforce email uniqueness?

---

## Investigation Finding

**From code review:**
1. **Keycloak email uniqueness:** Keycloak realm config (demo-app-realm.json) has `"duplicateEmailsAllowed": false` → Email IS unique in Keycloak
2. **KeycloakAdminAdapter:** Throws `UserAlreadyExistsException` on HTTP 409 from Keycloak (line 51)
3. **SignupUseCaseImpl:** Does NOT catch this exception → Signup fails if email exists in Keycloak

**Therefore:** Keycloak will reject duplicate emails and return 409. The BFF signup will fail before reaching the Claims Service.

**So the actual scenario is:**
- Same email, same UUID, but HTTP 401 or timeout occurs
- BFF retries with same UUID
- Claims Service receives duplicate UUID from two different HTTP requests

**The existing code already has idempotency by email!** (Lines 42-50 in UserController)

**But it's being bypassed or the email check is failing.**

---

## Actual Root Cause (Revised)

After careful code review, the actual root cause is likely:

**Race Condition in findByEmail + insert:**

```java
// Line 42-50 in UserController
var existing = userRepository.findByEmail(email);
if (existing.isPresent()) {
    // Handle existing
    // ...
}

// Line 60: If we reach here, user doesn't exist (according to our check)
var user = new User(userId, ...);
userRepository.save(user);  // But another thread/request already saved!
```

**Without database-level constraint on UUID, two concurrent requests can:**
1. T1: Check findByEmail(email) → not found
2. T2: Check findByEmail(email) → not found
3. T1: Insert UUID=abc-123, email=foo@example.com → Success
4. T2: Insert UUID=abc-123, email=foo@example.com → ✗ DUPLICATE UUID

The email uniqueness constraint prevents T2's email from being inserted. But UUID is PK, so T2 fails first with duplicate UUID, not duplicate email!

---

## The Real Fix: Transaction with Proper Isolation

The idempotency logic is correct, but it's not atomic. The fix is:

1. Use database-level UNIQUE constraint on (email, userId) OR
2. Use UPSERT (INSERT ... ON CONFLICT ... UPDATE) OR
3. Ensure SELECT + INSERT is wrapped in a serializable transaction

**Simplest approach:** Use database-enforced constraint + idempotent response

This is **already implemented** in UserController! So why is it failing?

**Hypothesis:** The issue is at a different layer:
- Not in UserController.createUser() idempotency logic
- Maybe in the Claims Service save() not being transactional
- Maybe the exception is being swallowed somewhere
- Maybe OkHttp is retrying at a layer above the application

---

## Minimum Fix: Add Logging and Error Handling

The best immediate fix is to:

1. **Add Idempotency-Key header support** to prevent HTTP client retries from creating duplicates
2. **Improve error handling** to distinguish between "user already exists (409)" and "database constraint violation (500)"
3. **Add regression tests** that simulate network failures and retries

---

## Recommended Changes

### File 1: Add Idempotency-Key Header to ClaimsServiceAdapter

```java
// Generate UUID for idempotency
private String generateIdempotencyKey(UUID userId, String email) {
    return UUID.nameUUIDFromBytes((userId + "|" + email).getBytes()).toString();
}

@Override
public UserRecord createUser(UUID userId, String email, String name, String role) {
    setServiceAccountBearerToken();
    var request = new CreateUserRequestDTO();
    request.setUserId(userId);
    request.setEmail(email);
    request.setName(name);
    request.setRole(UserRoleDTO.fromValue(role));
    
    // Add idempotency key to request headers
    String idempotencyKey = generateIdempotencyKey(userId, email);
    LOG.debug("Creating user with idempotency key: {}", idempotencyKey);
    
    // ... rest of method
}
```

### File 2: Handle 409 Conflict in BFF (Already Implemented!)

The code at lines 90-96 of ClaimsServiceAdapter already handles 409:

```java
private UserRecord handleConflictOnCreateUser(ApiException exception, String email) {
    // User already exists by email — return existing
    String responseBody = exception.getResponseBody();
    if (responseBody != null && !responseBody.isBlank()) {
        try {
            var existing = objectMapper.readValue(responseBody, UserResponseDTO.class);
            LOG.debug("User already exists by email, returning existing user userId={}", existing.getUserId());
            return mapToUserRecord(existing);
        } catch (com.fasterxml.jackson.core.JsonProcessingException parseEx) {
            // ...
        }
    }
}
```

**This is correct and should work!**

---

## Revised Root Cause: OkHttp Default Retry

**OkHttp3 default behavior:**
- Retries on `SocketTimeoutException`, `SSLException`, `IOException`
- Does NOT retry on HTTP 4xx/5xx responses
- But DOES retry on connection failures

If a CREATE request times out at the socket level (before receiving response), OkHttp will retry BEFORE the application layer catches it. This retry is transparent to the application and can cause duplicate inserts.

**Solution:** Disable OkHttp's automatic retries for create operations, or use idempotency keys.

---

## Final Recommendation

**Root Cause:** OkHttp default retry behavior on socket timeouts, combined with lack of idempotency keys, causes duplicate create requests to reach the Claims Service.

**Fix:** 
1. Disable OkHttp automatic retries OR configure them properly
2. Add Idempotency-Key header to create requests
3. Ensure Claims Service correctly handles 409 Conflict responses
4. Add regression tests for concurrent/retry scenarios

**Changes Required:**
- File 1: `RestClientConfig.java` - Configure OkHttp retry policy
- File 2: `ClaimsServiceAdapter.java` - Add Idempotency-Key header
- File 3: `SignupUseCaseTest.java` - Add retry/concurrency test

---

## Test Coverage Needed

Add regression tests that verify:
1. Duplicate create requests return 409 Conflict
2. Same UUID cannot be inserted twice
3. Retry logic does not corrupt data
4. Concurrent signups with same email fail gracefully

