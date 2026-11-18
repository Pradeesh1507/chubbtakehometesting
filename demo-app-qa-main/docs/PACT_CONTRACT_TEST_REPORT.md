# Pact Contract Test Report (BFF → Claims Service)

Consumer-driven contract testing with **Pact JVM 4.6.3**.

- **Consumer:** `bff-service` — `ClaimsServiceConsumerPactTest`
- **Provider:** `claims-service` — `ClaimsServiceProviderPactTest`
- **Contract file:** `code/bff-service/pacts/bff-service-claims-service.json`
  (also copied to `code/claims-service/src/test/resources/pacts/` for provider verification)
- **Workflow:** file-based (no external Pact Broker required). The consumer run **generates**
  the pact; the provider run **verifies** it against the real, running Claims Service.

These are genuine Pact tests — the consumer side drives the **real generated OkHttp client**
(`com.example.bff.adapter.out.claims.ApiClient` + `ClaimsApi`/`UsersApi`) against a Pact mock
server, and the provider side replays the pact against a full `@SpringBootTest` Claims Service
with a PostgreSQL/Kafka Testcontainers backend. No hand-rolled JSON comparisons.

## Interactions (7)

| # | Interaction | Request | Expected response |
| --- | --- | --- | --- |
| 1 | Create a claim | `POST /api/claims` | `201` + `ClaimResponse` |
| 2 | List the user's claims | `GET /api/claims` | `200` + array (min 1) |
| 3 | Get an existing claim | `GET /api/claims/{id}` | `200` + `ClaimResponse` |
| 4 | Get a non-existent claim | `GET /api/claims/{id}` | `404` + ProblemDetail |
| 5 | Get a claim owned by another user | `GET /api/claims/{id}` | `403` + ProblemDetail |
| 6 | Provision a new user | `POST /api/users` | `201` + `UserResponse` |
| 7 | Provision an existing user | `POST /api/users` | `409` + `UserResponse` |

All interactions assert Bearer auth and (for writes) `Content-Type: application/json`,
with type/structure matchers on the response bodies.

## Consumer results (actual)

```
# cd code\bff-service ; mvn test -Dtest=ClaimsServiceConsumerPactTest
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
Writing pact: code/bff-service/pacts/bff-service-claims-service.json
```

## Provider verification results (actual)

```
# cd code\claims-service ; mvn test -Dsurefire.excludedGroups= -Dgroups=integration -Dtest=ClaimsServiceProviderPactTest
Verifying a pact between bff-service and claims-service
  ... has status code 200 (OK)
  ... has status code 403 (OK)
  ... has status code 409 (OK)
  ... has status code 201 (OK)
  ... has status code 201 (OK)
  ... has status code 200 (OK)
  ... has status code 404 (OK)
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Provider states seed/clear the database deterministically (`@State` handlers via
`JdbcTemplate`) so the provider returns exactly what the consumer expects, e.g.:
- *"a claim with id 660e…001 exists for the user"* → insert claim owned by the test subject.
- *"a claim …aa belongs to another user"* → insert claim owned by a different user (→ 403).
- *"a user with id 990e…cc and email existing@example.com already exists"* → seed that user (→ 409).

Authentication during verification uses the Claims Service `contract-test` Spring profile,
which injects a deterministic JWT principal (subject `550e8400-e29b-41d4-a716-446655440000`,
roles `ADMIN`+`CLAIMANT`) so endpoints run without a live Keycloak.

## Defects found & fixed during contract testing

1. **Two security filter chains matched any request** under the `contract-test` profile
   (the production `SecurityConfig` chain was not excluded). Fix: annotate the main
   `filterChain` bean with `@Profile("!contract-test")` so the contract-test chain replaces it
   (no effect on any real environment).
2. **409-conflict contract initially failed** because the Claims Service only returns `409`
   when the request `userId` *equals* an existing user's id (a differing id triggers an
   id-migration update). Fix: the conflict interaction now uses a fixed `userId` that the
   provider state seeds, correctly exercising the conflict path.
3. **Stale pact interactions**: pact-jvm merges interactions on write; after changing a
   provider-state name the old interaction lingered. Fix: the contract is regenerated from a
   clean `pacts/` directory each run.

## Reproduce end-to-end

```powershell
cd code\bff-service ; mvn test "-Dtest=ClaimsServiceConsumerPactTest"
Copy-Item code\bff-service\pacts\*.json code\claims-service\src\test\resources\pacts\ -Force
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration" "-Dtest=ClaimsServiceProviderPactTest"
```

## Evidence
- `code/bff-service/pacts/bff-service-claims-service.json` (generated contract)
- `code/bff-service/pact-consumer-output.txt`
- `code/claims-service/pact-provider-output.txt`
