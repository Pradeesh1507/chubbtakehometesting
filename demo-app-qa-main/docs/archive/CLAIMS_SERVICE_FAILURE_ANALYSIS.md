# Claims Service Test Failure Analysis

## Executive Summary

Investigation of the nine (9) remaining test failures in the Claims Service reveals **two distinct root causes**:

| Issue | Type | Severity | Tests Affected | Root Cause |
|-------|------|----------|----------------|-----------|
| **Issue #1** | Test Code Bug | HIGH | 6 tests | KafkaDomainEventPublisher test fixture mocking ObjectMapper incorrectly |
| **Issue #2** | Test Code Bug | HIGH | 3 tests | CreateClaimUseCase test fixture missing ApplicationEventPublisher dependency |

Both issues are **test-only bugs** that prevent proper testing of event publishing functionality. No production code issues detected.

---

## Detailed Failure Analysis

### Issue #1: KafkaDomainEventPublisher Test Failures (6 failures)

**Affected Tests:** 6 of 7 tests in `KafkaDomainEventPublisherTest`

**Files:**
- Production: `code/claims-service/src/main/java/com/example/demo/adapter/out/messaging/KafkaDomainEventPublisher.java`
- Test: `code/claims-service/src/test/java/com/example/demo/adapter/out/messaging/KafkaDomainEventPublisherTest.java`

#### Root Cause Analysis

**Problem:** The test mocks `ObjectMapper` completely with `@Mock`, but the production code uses `objectMapper.createObjectNode()` which is not stubbed.

**Production Code Flow:**

```java
@Override
public void publish(DomainEvent event) {
    String key = extractKey(event);
    String eventType = resolveEventType(event);
    String payload = buildEnvelope(eventType, event);  // ← Calls buildEnvelope()
    String schemaName = resolveSchemaName(event);
    schemaValidator.validate(payload, schemaName);
    kafkaTemplate.send(TOPIC, key, payload);
}

private String buildEnvelope(String eventType, DomainEvent event) {
    try {
        ObjectNode envelope = objectMapper.createObjectNode();  // ← Returns NULL when mocked!
        envelope.put("eventType", eventType);  // ← NullPointerException here (line 45)
        // ... more code ...
        return objectMapper.writeValueAsString(envelope);
    } catch (JsonProcessingException ex) {
        throw new IllegalStateException("Failed to serialize domain event envelope", ex);
    }
}
```

**What Happens:**
1. Test creates `@Mock private ObjectMapper objectMapper;`
2. Test stubs only `objectMapper.writeValueAsString()` via `when(...).thenReturn(...)`
3. Production code calls `objectMapper.createObjectNode()` - this method is NOT mocked/stubbed
4. Mocked ObjectMapper returns null for unstubbed methods
5. Code tries to call `envelope.put("eventType", eventType)` on null → NullPointerException

#### Failing Tests and Error Patterns

| Test Name | Line | Error Type | Message |
|-----------|------|-----------|---------|
| `should_PublishEventToKafka_When_ClaimSubmittedEventProvided` | 67 | ERROR | NullPointerException at buildEnvelope:45 |
| `should_PublishEventToKafka_When_ClaimStatusChangedEventProvided` | 90 | ERROR | NullPointerException at buildEnvelope:45 |
| `should_CallValidatorWithCorrectArgs_When_ClaimSubmittedEventPublished` | 167 | ERROR | NullPointerException at buildEnvelope:45 |
| `should_ThrowIllegalStateException_When_SerializationFails` | 141 | FAILURE | Expected IllegalStateException, got NullPointerException |
| `should_PropagateValidationException_When_ValidatorRejectsMissingRequiredField` | 191 | FAILURE | Expected KafkaMessageValidationException, got NullPointerException |
| `should_PropagateValidationException_When_ValidatorRejectsInvalidClaimStatus` | 214 | FAILURE | Expected KafkaMessageValidationException, got NullPointerException |

**Root Cause:** All failures point to `objectMapper.createObjectNode()` returning null

#### Evidence from Test Code

**Lines 50-70 (Test that fails):**
```java
@Test
void should_PublishEventToKafka_When_ClaimSubmittedEventProvided() throws JsonProcessingException {
    UUID claimId = UUID.randomUUID();
    var event = new ClaimSubmitted(...);
    
    // ❌ PROBLEM: Only mocking writeValueAsString, not createObjectNode
    when(objectMapper.writeValueAsString(event)).thenReturn("{\"eventId\":\"test\"}");
    doNothing().when(schemaValidator).validate(anyString(), anyString());
    when(kafkaTemplate.send(anyString(), anyString(), anyString()))
            .thenReturn(CompletableFuture.completedFuture(null));

    publisher.publish(event);  // ← Calls buildEnvelope(), which calls createObjectNode()
                               // ← createObjectNode() is NOT mocked, returns null
    
    verify(kafkaTemplate).send(eq("claim-events"), eq(claimId.toString()), eq("{\"eventId\":\"test\"}"));
    verify(schemaValidator).validate("{\"eventId\":\"test\"}", "ClaimSubmittedMessage");
}
```

**Working Test (Line 101-120 - NOT in failing list):**
```java
@Test
void should_SerializeEventFields_When_EventPublished() throws JsonProcessingException {
    // ✅ Uses REAL ObjectMapper (not mocked)
    ObjectMapper realMapper = new ObjectMapper();
    realMapper.findAndRegisterModules();
    KafkaDomainEventPublisher realPublisher = new KafkaDomainEventPublisher(kafkaTemplate, realMapper, schemaValidator);
    
    // This test passes because it uses the real ObjectMapper that actually creates ObjectNodes
}
```

---

### Issue #2: CreateClaimUseCase Test Failures (3 failures)

**Affected Tests:** 3 of 4 tests in `CreateClaimUseCaseTest`

**Files:**
- Production: `code/claims-service/src/main/java/com/example/demo/application/usecases/CreateClaimUseCase.java`
- Test: `code/claims-service/src/test/java/com/example/demo/application/usecases/CreateClaimUseCaseTest.java`

#### Root Cause Analysis

**Problem:** `CreateClaimUseCase` requires `ApplicationEventPublisher`, but the test fixture doesn't provide it.

**Production Code:**

```java
@Service
@Transactional
@RequiredArgsConstructor
public class CreateClaimUseCase {

    private final ClaimRepository claimRepository;
    private final UserRepository userRepository;
    private final MeterRegistry meterRegistry;
    private final ApplicationEventPublisher eventPublisher;  // ← REQUIRED DEPENDENCY

    public Claim execute(CreateClaimCommand command) {
        // ... code ...
        Claim savedClaim = claimRepository.save(claim);

        if (cdcEnabled) {
            LOG.info("CDC enabled — event will be published by Debezium for claimId={}", savedClaim.getClaimId());
        } else {
            LOG.info("CDC disabled — publishing {} event(s) directly for claimId={}",
                    claim.getDomainEvents().size(), savedClaim.getClaimId());
            claim.getDomainEvents().forEach(eventPublisher::publishEvent);  // ← Line 54
            claim.clearEvents();
        }
        // ...
    }
}
```

**Test Code (Broken):**

```java
@ExtendWith(MockitoExtension.class)
class CreateClaimUseCaseTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MeterRegistry meterRegistry;

    @Mock
    private Counter mockCounter;

    @InjectMocks
    private CreateClaimUseCase useCase;  // ← Mockito tries to inject dependencies
                                          // ← ApplicationEventPublisher is NOT mocked, so it's null!

    @BeforeEach
    void setUp() {
        lenient().when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(mockCounter);
    }

    @Test
    void should_CreateClaim_When_ValidCommandProvided() {
        // ... test setup ...
        Claim result = useCase.execute(command);  // ← Crashes at line 54
                                                   // ← eventPublisher is null
    }
}
```

**What Happens:**
1. `@InjectMocks` creates an instance of `CreateClaimUseCase` using Mockito
2. Mockito injects the three mocked dependencies: `ClaimRepository`, `UserRepository`, `MeterRegistry`
3. `ApplicationEventPublisher` is NOT mocked, so the field remains null
4. Test calls `useCase.execute(command)`
5. Code reaches line 54: `claim.getDomainEvents().forEach(eventPublisher::publishEvent);`
6. `eventPublisher` is null → NullPointerException

#### Failing Tests and Error Patterns

| Test Name | Line | Error | Root Cause |
|-----------|------|-------|-----------|
| `should_CreateClaim_When_ValidCommandProvided` | 66 | NullPointerException | ApplicationEventPublisher is null |
| `should_PublishClaimSubmittedEvent_When_ClaimCreated` | 109 | NullPointerException | ApplicationEventPublisher is null |
| `should_SetStatusToSubmitted_When_ClaimCreated` | 129 | NullPointerException | ApplicationEventPublisher is null |

**Passing Test:**
- `should_ThrowUserNotFoundException_When_UserDoesNotExist` (1 test) - Passes because it throws before reaching line 54

#### Evidence from Test Code

**CreateClaimUseCaseTest.java (lines 32-47):**
```java
@ExtendWith(MockitoExtension.class)
class CreateClaimUseCaseTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MeterRegistry meterRegistry;

    @Mock
    private Counter mockCounter;

    @InjectMocks
    private CreateClaimUseCase useCase;  // ❌ Missing: ApplicationEventPublisher mock

    @BeforeEach
    void setUp() {
        lenient().when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(mockCounter);
        // ❌ No setup for eventPublisher
    }
}
```

**Compare with Fixed Test (UpdateClaimStatusUseCaseTest - which we fixed):**
```java
@BeforeEach
void setUp() {
    claimRepository = mock(ClaimRepository.class);
    userRepository = mock(UserRepository.class);
    meterRegistry = new SimpleMeterRegistry();
    eventPublisher = mock(ApplicationEventPublisher.class);  // ✅ Added mock
    useCase = new UpdateClaimStatusUseCase(
        claimRepository, 
        userRepository, 
        meterRegistry,
        eventPublisher  // ✅ Provided to constructor
    );
}
```

---

## Relationship Analysis: Are Failures Cascading?

**Question:** Are the CreateClaimUseCase failures cascading from the KafkaDomainEventPublisher issue?

**Answer:** **NO - They are independent issues.**

**Evidence:**

1. **Different Failure Points:**
   - KafkaDomainEventPublisher: `ObjectNode envelope = objectMapper.createObjectNode();` (line 45)
   - CreateClaimUseCase: `ApplicationEventPublisher eventPublisher` initialization (constructor)

2. **Different Error Stacks:**
   - KafkaDomainEventPublisher: `NullPointerException at KafkaDomainEventPublisher.buildEnvelope():45`
   - CreateClaimUseCase: `NullPointerException at Objects.requireNonNull() → CreateClaimUseCase:54`

3. **Different Root Causes:**
   - KafkaDomainEventPublisher: Mocking strategy issue (createObjectNode not stubbed)
   - CreateClaimUseCase: Missing mock (ApplicationEventPublisher not provided)

4. **Can Fix Independently:**
   - Fixing KafkaDomainEventPublisherTest will not fix CreateClaimUseCaseTest
   - Fixing CreateClaimUseCaseTest will not fix KafkaDomainEventPublisherTest

---

## Recommended Fixes

### Fix #1: KafkaDomainEventPublisher Tests

**Issue:** Tests mock ObjectMapper completely but don't stub `createObjectNode()` method

**Solution:** Use a real ObjectMapper instead of a mocked one

**Why This Works:**
- The tests only need to mock KafkaTemplate and KafkaMessageSchemaValidator
- Jackson ObjectMapper is well-tested third-party code
- Using a real ObjectMapper allows the full envelope building logic to execute
- Tests can still verify correct calls to kafkaTemplate.send() and schemaValidator.validate()

**Implementation Pattern:**
```java
@BeforeEach
void setUp() {
    kafkaTemplate = mock(KafkaTemplate.class);
    schemaValidator = mock(KafkaMessageSchemaValidator.class);
    
    // Use REAL ObjectMapper instead of mocking it
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    
    publisher = new KafkaDomainEventPublisher(kafkaTemplate, objectMapper, schemaValidator);
}
```

**Tests Affected:** 6 of 7 KafkaDomainEventPublisherTests (all except the one that already uses real ObjectMapper)

**Risk Level:** LOW
- No production code changes
- Well-established mocking pattern for Jackson
- Improves test quality

---

### Fix #2: CreateClaimUseCase Tests

**Issue:** Test fixture doesn't provide ApplicationEventPublisher mock

**Solution:** Add ApplicationEventPublisher mock to test fixture with @Mock annotation

**Why This Works:**
- Matches the pattern used in UpdateClaimStatusUseCaseTest (which we fixed)
- Provides the required dependency to satisfy constructor
- Allows the full execute() method to run without NPE

**Implementation Pattern:**
```java
@ExtendWith(MockitoExtension.class)
class CreateClaimUseCaseTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MeterRegistry meterRegistry;

    @Mock
    private ApplicationEventPublisher eventPublisher;  // ✅ ADD THIS

    @Mock
    private Counter mockCounter;

    @InjectMocks
    private CreateClaimUseCase useCase;

    @BeforeEach
    void setUp() {
        lenient().when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(mockCounter);
        // applicationEventPublisher is automatically injected by @InjectMocks
    }
}
```

**Tests Affected:** 3 of 4 CreateClaimUseCaseTests

**Risk Level:** LOW
- No production code changes
- Same pattern as UpdateClaimStatusUseCaseTest fix
- ApplicationEventPublisher is properly mocked, so no actual publishing occurs

---

## Risk Assessment

| Factor | Assessment | Details |
|--------|-----------|---------|
| **Production Code Impact** | NONE | Zero production code changes required |
| **Test-Only Changes** | YES | Only test fixtures need updates |
| **Breaking Changes** | NO | Tests will become more functional, not less |
| **Complexity** | LOW | Simple fixture updates using established patterns |
| **Regression Risk** | VERY LOW | Using real ObjectMapper is safer than mocking it |
| **Validation Complexity** | LOW | Re-run tests to verify fixes |

---

## Summary of Findings

### Nine Failures - Two Root Causes

| Failure Category | Count | Root Cause | Type | Severity |
|------------------|-------|-----------|------|----------|
| KafkaDomainEventPublisher | 6 | Mocked ObjectMapper returns null for createObjectNode() | Test Fixture Bug | HIGH |
| CreateClaimUseCase | 3 | Missing ApplicationEventPublisher mock in fixture | Test Fixture Bug | HIGH |
| **TOTAL** | **9** | **Both are test-only issues** | **Test Code** | **HIGH** |

### Key Insights

1. **No Production Code Issues** - Both are test fixture problems
2. **Independent Issues** - Not cascading; each has distinct root cause
3. **Same Pattern Mismatch** - Both failures related to missing/incorrect dependency mocking
4. **Easy to Fix** - Both fixable with straightforward test updates
5. **Improves Quality** - Fixes will improve test coverage of event publishing functionality

---

## Recommended Implementation Order

**Phase 1: Immediate**
1. Fix CreateClaimUseCase tests (add ApplicationEventPublisher mock) - 1 line
2. Fix KafkaDomainEventPublisher tests (use real ObjectMapper) - 2-3 lines per test method
3. Re-run tests to verify fixes

**Phase 2: Validation**
1. Verify all 9 previously-failing tests now pass
2. Verify no regression in other tests
3. Confirm complete test suite reaches 100% pass rate

**Phase 3: Documentation**
1. Update test documentation to explain why real ObjectMapper is used
2. Document the dual-mode event publishing pattern
3. Update CI/CD guides with correct JAVA_HOME settings

---

## Affected Test Files

### File #1: KafkaDomainEventPublisher Tests
- **Location:** `code/claims-service/src/test/java/com/example/demo/adapter/out/messaging/KafkaDomainEventPublisherTest.java`
- **Failing Tests:** 6 of 7
- **Fix Type:** Change @Mock to real ObjectMapper in setUp()
- **Complexity:** Medium (affects multiple test methods)

### File #2: CreateClaimUseCase Tests
- **Location:** `code/claims-service/src/test/java/com/example/demo/application/usecases/CreateClaimUseCaseTest.java`
- **Failing Tests:** 3 of 4
- **Fix Type:** Add @Mock for ApplicationEventPublisher
- **Complexity:** Low (single line addition)

---

## Code Evidence

### Evidence A: KafkaDomainEventPublisher.buildEnvelope() - Line 45

**File:** `code/claims-service/src/main/java/com/example/demo/adapter/out/messaging/KafkaDomainEventPublisher.java`

The problematic code:
```java
private String buildEnvelope(String eventType, DomainEvent event) {
    try {
        ObjectNode envelope = objectMapper.createObjectNode();  // LINE 45
        envelope.put("eventType", eventType);
        // ... rest of method ...
    } catch (JsonProcessingException ex) {
        throw new IllegalStateException("Failed to serialize domain event envelope", ex);
    }
}
```

When `objectMapper` is a Mockito mock and `createObjectNode()` is not stubbed, it returns null.

### Evidence B: CreateClaimUseCase.execute() - Line 54

**File:** `code/claims-service/src/main/java/com/example/demo/application/usecases/CreateClaimUseCase.java`

The problematic code:
```java
claim.getDomainEvents().forEach(eventPublisher::publishEvent);  // LINE 54
```

When `eventPublisher` is null (not injected by test fixture), attempting to call methods on it throws NullPointerException.

---

**Analysis Complete:** 2026-11-16T19:15:00+05:30  
**Analysis Type:** Test Failure Root Cause Investigation  
**Status:** READY FOR REMEDIATION
