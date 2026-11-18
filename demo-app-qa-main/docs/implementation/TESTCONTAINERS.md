# Implementation Guide — Testcontainers Integration Tests

How the real-dependency integration tests are built and run. For *what/why* see
[../TEST_STRATEGY.md](../TEST_STRATEGY.md); for *results* see
[../INTEGRATION_TEST_REPORT.md](../INTEGRATION_TEST_REPORT.md).

## Purpose
Exercise the services against **real** PostgreSQL, Kafka, Redis and Keycloak containers (not
H2/mocks) to catch persistence, migration, FK, messaging and wiring defects that unit tests
cannot.

## Architecture
- Tests are tagged `@Tag("integration")` and **excluded from the default `mvn test`**
  (`<surefire.excludedGroups>integration</surefire.excludedGroups>` in each `pom.xml`).
- Spring Boot `@ServiceConnection` auto-wires container connection details; a
  `@DynamicPropertyRegistrar` supplies Keycloak issuer/JWKS URIs and per-fork Redis DB isolation.
- Two patterns are used:
  - **Slice** — `@DataJpaTest` + a dedicated `PostgreSQLContainer` (fast repository tests).
  - **Full context** — `@SpringBootTest` + `@Import(TestcontainersConfiguration.class)`
    (Postgres + Kafka + Redis + Keycloak) for application/health/contract tests.

## Key files
- `code/claims-service/src/test/java/com/example/demo/TestcontainersConfiguration.java`
  — `PostgreSQLContainer`, `KafkaContainer(apache/kafka-native)`, `GenericContainer(redis)`,
    `KeycloakContainer(quay.io/keycloak/keycloak:26.1.4)`.
- `code/claims-service/.../adapter/out/persistence/ClaimRepositoryIntegrationTest.java`
- `code/claims-service/.../HealthCheckIntegrationTest.java`, `ClaimsServiceApplicationTests.java`
- `code/bff-service/.../adapter/in/messaging/ClaimEventKafkaConsumerIntegrationTest.java`
- `code/bff-service/.../adapter/in/web/RbacIntegrationTest.java`

## Important configuration
- **Test JVM timezone pinned to UTC** via surefire `argLine`:
  `<argLine>@{argLine} -Duser.timezone=UTC</argLine>` (keeps the JaCoCo agent argLine).
  Without this, pgjdbc forwards the host's legacy `Asia/Calcutta` zone and PostgreSQL rejects it.
- Containers use `withReuse(true)` for speed; Redis DB is isolated per surefire fork.

## Run
```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"
cd code\bff-service    ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"
```
Prerequisite: Docker Desktop running.

## Expected results
- Claims: `Tests run: 8, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`.
- BFF integration (`ClaimEventKafkaConsumerIntegrationTest` 3 + `RbacIntegrationTest` 11) green
  within the BFF all-tests run (228 total).
- Logs show real containers starting: `postgres:15-alpine`, `apache/kafka-native:latest`,
  `redis:latest`, `quay.io/keycloak/keycloak:26.1.4`, plus `testcontainers/ryuk`.

## Troubleshooting
- **`FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"`** → the UTC `argLine` is
  missing or overridden; ensure `@{argLine} -Duser.timezone=UTC` is present.
- **`Could not find a valid Docker environment`** → start Docker Desktop.
- **Ryuk / reuse warnings** → harmless; set `testcontainers.reuse.enable=true` in
  `~/.testcontainers.properties` to benefit from `withReuse`.
- **Keycloak container slow to start** → first pull is slow; subsequent runs reuse the image.
