Act as a Senior Java QA Automation Engineer.

Refer to:
- docs/REPOSITORY_ANALYSIS.md
- docs/BASELINE_TEST_REPORT.md
- docs/CLAIMS_SERVICE_TEST_FIX.md
- docs/CLAIMS_SERVICE_FAILURE_ANALYSIS.md

## Objective

Fix the two identified test fixture issues without changing production code.

## Fix 1 – KafkaDomainEventPublisherTest

File:
code/claims-service/src/test/java/com/example/demo/adapter/out/messaging/KafkaDomainEventPublisherTest.java

1. Inspect the existing test class and production KafkaDomainEventPublisher.
2. Replace the mocked ObjectMapper with a real ObjectMapper instance where appropriate.
3. Retain mocks for KafkaTemplate and KafkaMessageSchemaValidator.
4. Preserve all existing test scenarios and assertions.
5. Ensure the serialization failure test still tests the intended exception path. Configure an appropriate test double or mechanism if necessary.

## Fix 2 – CreateClaimUseCaseTest

File:
code/claims-service/src/test/java/com/example/demo/application/usecases/CreateClaimUseCaseTest.java

1. Inspect the existing test class and CreateClaimUseCase.
2. Add a Mockito mock for ApplicationEventPublisher.
3. Ensure @InjectMocks can construct the use case with all required dependencies.
4. Preserve existing tests and assertions.

## Validation

Run these commands separately:

mvn test -Dtest=KafkaDomainEventPublisherTest

mvn test -Dtest=CreateClaimUseCaseTest

Then run:

mvn test

Capture actual results:
- Total tests
- Passed
- Failed
- Errors
- Skipped
- Build status

Do not assume all tests will pass.

## Rules

- Do not modify production code.
- Do not delete or disable tests.
- Do not weaken assertions to make tests pass.
- Do not change unrelated files.
- If a test exposes a production defect, document it instead of hiding it.

## Documentation

Create:

docs/CLAIMS_SERVICE_REMAINING_TEST_FIXES.md

Include:
1. Both original issues
2. Root causes
3. Files modified
4. Explanation of each fix
5. Test execution commands
6. Actual results
7. Remaining failures and recommendations

Update .claude/ai-journal.md with this session.

Do not overwrite previous reports.

Finally, show the code changes and complete test results.
