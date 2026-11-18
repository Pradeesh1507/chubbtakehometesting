# Prompt Library — Project Context

Quick context for anyone using this prompt library. The authoritative onboarding brief is
[../docs/PROJECT_CONTEXT.md](../docs/PROJECT_CONTEXT.md) — read that first.

## One-paragraph summary
**demo-app-qa** is a 3-tier Insurance Claims demo (Next.js UI → Spring Boot BFF → Spring Boot
Claims Service → PostgreSQL/Kafka, with Keycloak OAuth2 + Redis). The QA work added and verified
tests across every layer: unit, Testcontainers integration, Pact contracts, Playwright E2E, and
k6 performance, plus a CI pipeline and full documentation.

## Facts prompts rely on
- **Ports:** Claims 8080, BFF 8090, Keycloak 8180, Postgres 5432, Kafka 9092, UI dev 3001,
  **UI QA/E2E prod 3101**.
- **Seed users:** `admin@demo.com`/`Admin123!`, `claimant@demo.com`/`Claimant123!`.
- **Verified counts (2026-11-17):** Claims unit 197; BFF 228 (207+7+14); Claims integration 8;
  Pact 7/7; Vitest 268; E2E 24 (×3); k6 smoke/load/stress 100% checks / 0% errors.
- **Decisions:** test JVM pinned to UTC; integration tagged `@Tag("integration")`; Pact
  file-based with `contract-test` profile; frontend proxy omits empty Authorization + sends
  `X-XSRF-TOKEN` on logout; E2E login retry + k6 authenticate-once for Keycloak brute-force.

## Guardrails (every prompt)
- Read `../docs/PROJECT_CONTEXT.md` and `COPILOT_WORKING_GUIDELINES.md` first.
- Don't change app behaviour / test assertions / Docker config for convenience.
- Preserve passing tests; run tests; record ACTUAL results; update `../ai-journal.md`.
