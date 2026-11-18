# QA-003 — Testcontainers Integration Tests

- **Prompt ID:** QA-003
- **Name:** Integration tests with Testcontainers
- **Version:** 1.0
- **Status:** ACTIVE. **RECONSTRUCTED** — synthesized from the Part-2 "all testing layers"
  assessment prompt (the original per-layer wording was part of a single combined prompt, not a
  standalone file). Not a verbatim original.
- **Execution status:** Executed — Claims integration **8 passed** (real Postgres/Kafka/Keycloak/
  Redis). See `docs/implementation/TESTCONTAINERS.md` and `docs/INTEGRATION_TEST_REPORT.md`.

## Objective
Add/execute genuine integration tests using real containers (not H2/mocks).

## Context & prerequisites
- Docker Desktop running. Spring Boot 4 / Java 21.
- Tests tagged `@Tag("integration")`, excluded from default `mvn test`.
- Read `docs/implementation/TESTCONTAINERS.md`.

## Reusable prompt text
```
Implement genuine integration tests using Testcontainers for the Insurance Claims services.
Claims: PostgreSQL persistence, repository, entity relationships, DB constraints (FK),
transaction behaviour, status transitions, boundary data, relevant Kafka interactions.
BFF: controller->service, auth/authorisation, Claims Service communication, request/response
mapping, error propagation, cookie/token handling.

Requirements: REAL Postgres/Kafka containers (not H2); dynamic container properties
(@ServiceConnection / @DynamicPropertyRegistrar); isolated test data; reliable lifecycle;
deterministic (pin the test JVM to UTC). Tag integration tests @Tag("integration").
Run them explicitly and record ACTUAL results. If Docker/an external dependency blocks
execution, document the exact failure — never substitute mocks and claim Testcontainers success.
```

## Execution steps
1. Ensure the UTC `argLine` is in each pom's surefire config (deterministic + pgjdbc/Postgres TZ).
2. `mvn test -Dsurefire.excludedGroups= -Dgroups=integration` per service (Docker required).
3. Capture container-start logs + the `Tests run:` summary.

## Verification
- Claims: `Tests run: 8, Failures: 0 — BUILD SUCCESS`; logs show real container images started.

## Related files
- `code/claims-service/src/test/java/com/example/demo/TestcontainersConfiguration.java`
- `code/claims-service/.../ClaimRepositoryIntegrationTest.java`, `HealthCheckIntegrationTest.java`
- `code/bff-service/.../ClaimEventKafkaConsumerIntegrationTest.java`, `RbacIntegrationTest.java`
- `code/*/pom.xml` (surefire `argLine` UTC)
