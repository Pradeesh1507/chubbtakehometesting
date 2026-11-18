# Implementation Guide — Pact Contract Testing (BFF → Claims)

How consumer-driven contract testing is wired. For *results* see
[../PACT_CONTRACT_TEST_REPORT.md](../PACT_CONTRACT_TEST_REPORT.md); for *what/why* see
[../TEST_STRATEGY.md](../TEST_STRATEGY.md).

## Purpose
Guarantee the BFF (consumer) and Claims Service (provider) agree on the HTTP contract, catching
breaking changes to paths, status codes, headers and JSON structure before integration.

## Architecture (file-based workflow, no broker)
1. **Consumer** test drives the **real generated OkHttp client** against a Pact **mock server**;
   this writes the contract to `code/bff-service/pacts/bff-service-claims-service.json`.
2. The contract is copied to `code/claims-service/src/test/resources/pacts/`.
3. **Provider** test replays each interaction against a full `@SpringBootTest` Claims Service
   (Testcontainers backend), seeding state per interaction.

Pact JVM **4.6.3** (`au.com.dius.pact.consumer:junit5`, `au.com.dius.pact.provider:junit5`).

## Key files
- Consumer: `code/bff-service/src/test/java/com/example/demo/contract/ClaimsServiceConsumerPactTest.java`
- Provider: `code/claims-service/src/test/java/com/example/demo/contract/ClaimsServiceProviderPactTest.java`
- Contract: `code/bff-service/pacts/bff-service-claims-service.json`
- Provider auth: `code/claims-service/.../config/ContractTestSecurityConfiguration.java` (`@Profile("contract-test")`)

## Interactions (7)
create claim `201`, list claims `200`, get claim `200`, get claim `404`, get claim `403`
(other user), create user `201`, create user `409` (conflict).

## Important configuration
- Surefire sets `-Dpact.rootDir=${project.basedir}/pacts` (BFF) so the contract lands in `pacts/`.
- Provider test: `@Provider("claims-service")`, `@PactFolder("src/test/resources/pacts")`,
  `@Tag("integration")`, `HttpTestTarget("localhost", port)`.
- **`contract-test` profile** injects a deterministic JWT principal (subject
  `550e8400-e29b-41d4-a716-446655440000`, roles ADMIN+CLAIMANT) so endpoints run without Keycloak.
- The production `SecurityConfig.filterChain` is `@Profile("!contract-test")` so the contract-test
  chain replaces it (no effect on real environments).
- `@State` handlers seed/clear the DB via `JdbcTemplate` so the provider returns what the
  consumer expects (e.g. seed claim `660e…001` for the user; claim `770e…aa` for another user
  → 403; user `990e…cc` + `existing@example.com` → 409).

## Run (end-to-end)
```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
cd code\bff-service    ; mvn test "-Dtest=ClaimsServiceConsumerPactTest"
Copy-Item code\bff-service\pacts\*.json code\claims-service\src\test\resources\pacts\ -Force
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration" "-Dtest=ClaimsServiceProviderPactTest"
```

## Expected results
- Consumer: `Tests run: 7, Failures: 0 — BUILD SUCCESS` + pact written.
- Provider: `Verifying a pact between bff-service and claims-service` →
  `Tests run: 7, Failures: 0 — BUILD SUCCESS` (statuses 200/403/409/201/201/200/404 all OK).

## Troubleshooting
- **`MissingStateChangeMethod`** → the pact contains a `providerState` name with no matching
  `@State` method. Regenerate the pact from a clean `pacts/` dir (pact-jvm *merges* on write, so
  renamed states leave stale interactions) and keep `@State` strings identical.
- **409 conflict verifies as non-409** → the provider returns 409 only when the request `userId`
  equals the existing user's id; use a fixed `userId` in both the consumer interaction and the
  `@State` seed.
- **Two filter chains match any request** → ensure the production `filterChain` is
  `@Profile("!contract-test")`.
- **Datetime parse warnings** (microsecond precision vs `SSS`) → non-fatal; matcher falls back
  to type matching and the body still matches.
