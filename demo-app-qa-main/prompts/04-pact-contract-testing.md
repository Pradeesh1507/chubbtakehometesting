# QA-004 — Pact Contract Testing (BFF ↔ Claims)

- **Prompt ID:** QA-004
- **Name:** Consumer-driven contract testing with Pact
- **Version:** 1.0
- **Status:** ACTIVE. **RECONSTRUCTED** — synthesized from the Part-2 "all testing layers"
  assessment prompt (per-layer wording was part of a combined prompt). Not a verbatim original.
- **Execution status:** Executed — **7 consumer** interactions generated, **7 provider**
  verified. See `docs/implementation/PACT_CONTRACT_TESTING.md`, `docs/PACT_CONTRACT_TEST_REPORT.md`.

## Objective
Prove the BFF (consumer) and Claims Service (provider) agree on the HTTP contract.

## Context & prerequisites
- Pact JVM 4.6.3. File-based workflow (no broker). Docker for provider verification.
- Read `docs/implementation/PACT_CONTRACT_TESTING.md`.

## Reusable prompt text
```
Implement consumer-driven contract testing between the BFF (consumer) and Claims Service
(provider) using Pact JVM.

Consumer (BFF): drive the REAL generated HTTP client against a Pact mock server for: create
claim (201), list claims (200), get claim (200/404/403), create user (201/409). Generate the
pact JSON.
Provider (Claims): verify every interaction against the real running provider (SpringBootTest +
Testcontainers), using provider-state (@State) DB seeding so responses match. Authenticate via a
dedicated contract-test profile.

Requirements: realistic request/response examples incl. status codes, headers, JSON structure;
validate error contracts too; deterministic provider states; wire contract tests into Maven.
Do NOT hand-compare JSON and call it Pact. Produce actual pact JSON + provider verification
output; record ACTUAL results.
```

## Execution steps
1. Run consumer: `mvn test -Dtest=ClaimsServiceConsumerPactTest` → pact written to `pacts/`.
2. Copy pact to `code/claims-service/src/test/resources/pacts/` (delete stale first; pact-jvm
   merges on write).
3. Run provider: `mvn test -Dsurefire.excludedGroups= -Dgroups=integration -Dtest=ClaimsServiceProviderPactTest`.

## Verification
- Consumer `Tests run: 7, Failures: 0`; provider `Verifying a pact …` → `7, Failures: 0`.

## Related files
- `code/bff-service/.../contract/ClaimsServiceConsumerPactTest.java`
- `code/claims-service/.../contract/ClaimsServiceProviderPactTest.java`
- `code/claims-service/.../config/ContractTestSecurityConfiguration.java`
- `code/bff-service/pacts/bff-service-claims-service.json`
