# CreateClaimUseCase Event Publishing Test Failure Analysis

## Executive Summary

**Test:** `CreateClaimUseCaseTest.should_PublishClaimSubmittedEvent_When_ClaimCreated`

**File:** `code/claims-service/src/test/java/com/example/demo/application/usecases/CreateClaimUseCaseTest.java` (Line 115)

**Failure:** `java.lang.AssertionError: Expecting actual not to be empty`

**Root Cause:** The test expects domain events to be present on the returned claim, but the `domainEvents` collection is empty because:

1. The test is a **unit test** using `@ExtendWith(MockitoExtension.class)` instead of `@SpringBootTest`
2. Mockito does NOT process Spring's `@Value` annotations
3. The `cdcEnabled` field in `CreateClaimUseCase` remains **uninitialized** (defaults to `false`)
4. When `cdcEnabled=false`, the production code calls `claim.clearEvents()` to clear domain events BEFORE they are published to Kafka
5. The test returns the same `claim` instance (via mock's `.thenAnswer()`), which now has an empty `domainEvents` collection
6. The test assertion fails because it expects `result.getDomainEvents()` to be non-empty

---

## Issue Classification

**Type:** Test Configuration Issue (NOT a production code bug)

**Location:** Test setup and configuration, not production logic

**Severity:** Medium - The test is validating the wrong scenario

---

## Detailed Code Analysis

### 1. Production Code: CreateClaimUseCase.java

**Lines 36-51: The problematic flow**

```java
Claim claim = new Claim(
        UUID.randomUUID(),
        command.userId(),
        command.incidentDate(),
        command.incidentLocation(),
        command.description(),
        command.claimAmount()
);  // ← Line 42: Claim constructor ADDS ClaimSubmitted event

Claim savedClaim = claimRepository.save(claim);  // ← Line 44: Same object returned by mock

if (cdcEnabled) {
    LOG.info("CDC enabled — event will be published by Debezium for claimId={}", savedClaim.getClaimId());
} else {
    LOG.info("CDC disabled — publishing {} event(s) directly for claimId={}",
            claim.getDomainEvents().size(), savedClaim.getClaimId());
    claim.getDomainEvents().forEach(eventPublisher::publishEvent);  // ← Line 50: Publish events
    claim.clearEvents();  // ← Line 51: CLEAR events from BOTH claim and savedClaim (same object)
}

return savedClaim;  // ← Returns the claim with EMPTY domainEvents list
```

**Key Detail:** Line 25 shows the uninitialized field:

```java
@Value("${app.events.cdc-enabled:true}")
private boolean cdcEnabled;
```

The default is `true`, but it's only applied when Spring loads the value. In a Mockito unit test, this annotation is ignored.

### 2. Claim Domain Model: Claim.java

**Constructor (lines 71-110):**

```java
public Claim(UUID claimId, UUID userId, LocalDate incidentDate,
             String incidentLocation, String description, BigDecimal claimAmount) {
    // ... validation ...
    
    this.status = ClaimStatus.SUBMITTED;
    this.createdAt = Instant.now();
    this.updatedAt = this.createdAt;

    this.domainEvents.add(new ClaimSubmitted(
        UUID.randomUUID().toString(),
        claimId,
        userId,
        incidentDate,
        claimAmount,
        Instant.now()
    ));  // ← Event IS added during construction
}
```

**getDomainEvents() and clearEvents() (lines 149-153):**

```java
public List<DomainEvent> getDomainEvents() {
    return List.copyOf(domainEvents);  // ← Returns immutable copy
}

public void clearEvents() {
    domainEvents.clear();  // ← Clears the INTERNAL list
}
```

### 3. Test Code: CreateClaimUseCaseTest.java

**Test Setup (lines 46-56):**

```java
@Mock
private ApplicationEventPublisher eventPublisher;

@InjectMocks
private CreateClaimUseCase useCase;

@BeforeEach
void setUp() {
    lenient().when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(mockCounter);
}
```

**Problem Areas:**
- `ApplicationEventPublisher` is mocked but never configured to verify calls
- `@Value("${app.events.cdc-enabled:true}")` is NOT processed by Mockito
- The mock `claimRepository.save()` returns the same object instance

**Failing Test (lines 102-115):**

```java
@Test
void should_PublishClaimSubmittedEvent_When_ClaimCreated() {
    UUID userId = UUID.randomUUID();
    when(userRepository.findById(UserId.of(userId))).thenReturn(Optional.of(mock(User.class)));
    when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
    // ↑ Mock returns the same Claim object instance

    CreateClaimCommand command = ClaimTestBuilder.aClaim()
            .withUserId(userId)
            .withIncidentLocation("456 Oak Avenue, Chicago")
            .withClaimAmount(new BigDecimal("2000.00"))
            .toCommand();

    Claim result = useCase.execute(command);

    assertThat(result.getDomainEvents()).isNotEmpty();  // ← Line 115: FAILS
    assertThat(result.getDomainEvents())
            .anyMatch(event -> event.getClass().getSimpleName().equals("ClaimSubmitted"));
}
```

---

## Execution Trace

```
1. Test runs with Mockito (no Spring context)
   ↓
2. CreateClaimUseCase.execute() is called
   ↓
3. Claim constructor runs → adds ClaimSubmitted event to domainEvents
   ↓
4. claimRepository.save(claim) is called (mocked)
   ↓
5. Mock returns the SAME claim instance
   ↓
6. cdcEnabled field is UNINITIALIZED → defaults to false (Java primitive boolean)
   ↓
7. if (cdcEnabled=false) block executes:
     - Publishes events to eventPublisher
     - Calls claim.clearEvents() ← CLEARS the internal list
   ↓
8. return savedClaim (same instance, now with empty domainEvents)
   ↓
9. Test assertion: result.getDomainEvents().isNotEmpty() 
   ↓
10. FAIL: Collection is empty
```

---

## Why This Is a Test Issue (Not Production Code)

**Production Code is Correct:**
- When CDC is **enabled** (production default via `application.yml`): Events remain in `domainEvents` for Debezium to process
- When CDC is **disabled** (fallback mode): Events are published directly and then cleared (correct behavior to avoid duplicate processing)
- The logic is sound and matches the documented design

**Test Is Misconfigured:**
- Unit test with Mockito cannot activate Spring's `@Value` annotation
- Test does not explicitly set `cdcEnabled=true`
- Test expects events to remain after publication, which is only true in CDC-enabled mode
- Test should either:
  - Use `@SpringBootTest` to load Spring configuration, OR
  - Explicitly configure the `cdcEnabled` state via spy/reflection

---

## Minimal Recommended Fixes

### Option 1: Upgrade Test to @SpringBootTest (Most Complete)

**Recommended:** This properly tests the production scenario where Spring loads the `@Value` annotation.

```java
@SpringBootTest
class CreateClaimUseCaseTest {
    // Now Spring loads application.yml, cdcEnabled=true by default
    // Test will pass as events remain in the returned claim
}
```

**Pros:** 
- Tests with actual Spring configuration
- Validates the real production behavior
- @Value annotation is properly processed

**Cons:**
- Slower test execution
- Requires Spring context setup

### Option 2: Provide Test Configuration with @Value Override

Add a test application configuration that sets `cdc-enabled=true`:

**File:** `src/test/resources/application.yml` or `application-test.yml`

```yaml
app:
  events:
    cdc-enabled: true  # Explicitly enable CDC for unit tests
```

Then use on the test class:

```java
@SpringBootTest
@ActiveProfiles("test")
class CreateClaimUseCaseTest { ... }
```

**Pros:**
- Fast (using test profile can exclude Spring Boot auto-configurations)
- Explicit test configuration
- Clear intent

**Cons:**
- Requires additional configuration file

### Option 3: Mock the Field Value (Quick Fix)

Use `@ExtendWith(MockitoExtension.class)` with reflection to set the private field:

```java
@Test
void should_PublishClaimSubmittedEvent_When_ClaimCreated() throws Exception {
    // Set the private field via reflection
    java.lang.reflect.Field cdcField = CreateClaimUseCase.class.getDeclaredField("cdcEnabled");
    cdcField.setAccessible(true);
    cdcField.set(useCase, true);
    
    // ... rest of test ...
}
```

**Pros:**
- Minimal changes to existing test
- Keeps unit test approach

**Cons:**
- Fragile (relies on private field name)
- Less idiomatic than proper Spring testing
- Harder to maintain

### Option 4: Adjust Test Assertion (Incorrect - DO NOT USE)

**NOT RECOMMENDED:** Changing the test to expect empty events would mask the real issue:

```java
// ❌ WRONG: This assertion would pass but test becomes meaningless
assertThat(result.getDomainEvents()).isEmpty();
```

This defeats the purpose of the test.

---

## Recommended Solution: Use @SpringBootTest

Based on the test's intent to verify event publishing behavior, **Option 1 (@SpringBootTest)** is recommended:

**Minimal change to existing test:**

```java
// BEFORE:
@ExtendWith(MockitoExtension.class)
class CreateClaimUseCaseTest {

// AFTER:
@SpringBootTest
class CreateClaimUseCaseTest {
```

This:
1. Loads Spring context with actual `application.yml` configuration
2. `@Value("${app.events.cdc-enabled:true}")` is properly processed
3. `cdcEnabled` defaults to `true` (production default)
4. Events remain in `domainEvents` collection after claim creation
5. Test assertion passes as intended

Alternatively, if keeping Mockito-only tests, provide `src/test/resources/application.yml` with `cdc-enabled: true` and annotate with `@SpringBootTest`.

---

## Validation Command

Run the specific test after applying the fix:

```bash
mvn test -Dtest=CreateClaimUseCaseTest#should_PublishClaimSubmittedEvent_When_ClaimCreated
```

Expected output:
```
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

---

## Related Tests

Verify other tests in the same class continue to pass:

```bash
mvn test -Dtest=CreateClaimUseCaseTest
```

Expected: All 4 tests in the class should pass:
- `should_CreateClaim_When_ValidCommandProvided`
- `should_ThrowUserNotFoundException_When_UserDoesNotExist`
- `should_PublishClaimSubmittedEvent_When_ClaimCreated` ← Currently failing
- `should_SetStatusToSubmitted_When_ClaimCreated`

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Root Cause** | `@Value` annotation not processed in Mockito-only unit test; `cdcEnabled` defaults to `false` |
| **Affected Line** | CreateClaimUseCaseTest.java:115 |
| **Production Code** | No issue - logic is correct for both CDC-enabled and disabled modes |
| **Test Configuration** | Missing Spring context to activate `@Value` annotation |
| **Fix Type** | Test setup issue, not production code |
| **Minimal Fix** | Change `@ExtendWith(MockitoExtension.class)` to `@SpringBootTest` |
| **Impact** | Low - test infrastructure only, no production functionality affected |
| **Risk** | No risk - fix improves test coverage |

---

## Verification Checklist

After applying the recommended fix:

- [ ] Test runs with `@SpringBootTest`
- [ ] `application.yml` loads with `cdc-enabled: true`
- [ ] `should_PublishClaimSubmittedEvent_When_ClaimCreated` passes
- [ ] All other tests in `CreateClaimUseCaseTest` pass
- [ ] No production code changes required
- [ ] Event publishing behavior is properly validated in Spring context
