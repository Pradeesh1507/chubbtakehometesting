# Integration Test Report (Testcontainers)

**Scope:** Real-dependency integration tests for the Claims Service and BFF Service using
Testcontainers (PostgreSQL, Kafka, Keycloak, Redis). **Not** H2-as-Postgres — genuine
containers via Spring Boot `@ServiceConnection` / `@DynamicPropertySource`.

## How to run

Integration tests are tagged `@Tag("integration")` and excluded from the default `mvn test`.

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
# Claims Service — all integration tests
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"
# BFF Service — all integration tests
cd code\bff-service   ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"
```

Prerequisite: Docker Desktop running. The test JVM is pinned to `UTC`
(`-Duser.timezone=UTC`, configured in each `pom.xml` surefire plugin).

## Results (actual execution)

### Claims Service — `mvn test -Dgroups=integration`
```
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS   (Total time ~01:13 min)
```

| Test | Containers | What it proves |
| --- | --- | --- |
| `ClaimRepositoryIntegrationTest` (6) | PostgreSQL | Persistence + retrieval, ordering by `created_at DESC`, `updated_at` change on status update, **FK constraint** `fk_claims_user_id` enforced, required indexes present, find-by-status |
| `ClaimsServiceApplicationTests.contextLoads` | Postgres + Kafka + Keycloak + Redis | Full application context boots against real infrastructure |
| `HealthCheckIntegrationTest` | Postgres + Kafka + Keycloak + Redis | `/actuator/health` returns UP with all components wired |

Pact **provider verification** (`ClaimsServiceProviderPactTest`) is also an integration test
(full `@SpringBootTest` + Testcontainers) — see the Pact report. Running the whole
`integration` group executes the repository/health integration tests **and** provider
verification (15 integration test executions total: 8 + 7 pact interactions).

### BFF Service — `mvn test -Dsurefire.excludedGroups=` (unit + integration)
```
Tests run: 228, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```
Integration tests included:
- `ClaimEventKafkaConsumerIntegrationTest` — consumes claim events from a real Kafka container.
- `RbacIntegrationTest` — role-based access control through the real security filter chain.

## Defect found & fixed during integration testing

**PostgreSQL rejects the legacy `Asia/Calcutta` timezone.** The first integration run failed:

```
liquibase.exception.DatabaseException: org.postgresql.util.PSQLException:
FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"
```

Root cause: the PostgreSQL JDBC driver forwards the JVM's default zone id to the server on
connect; the host JVM default was `Asia/Calcutta` (a legacy alias PostgreSQL does not accept;
it only knows `Asia/Kolkata`). This broke every Spring-context integration test.

Fix (deterministic, portable): pin the test JVM to UTC via the surefire `argLine`
(`@{argLine} -Duser.timezone=UTC`, preserving the JaCoCo agent argLine) in both
`code/claims-service/pom.xml` and `code/bff-service/pom.xml`. After the fix: Claims
integration `8/8` green.

## Characteristics

- Real containers, dynamic ports/credentials via `@ServiceConnection` and
  `@DynamicPropertyRegistrar` — no dependency on the already-running app's database.
- Redis database isolation per surefire fork; container reuse (`withReuse(true)`) for speed.
- Deterministic: UTC JVM, isolated test data, explicit seeding/cleanup.

## Evidence
- `code/claims-service/claims-integration-output.txt`
- `code/bff-service/bff-all-tests-output.txt`
