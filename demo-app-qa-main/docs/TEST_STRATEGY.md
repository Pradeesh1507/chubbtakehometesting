# Test Strategy — demo-app-qa

> Comprehensive quality-assurance strategy for the `demo-app-qa` claims-management platform.

---

## 1. Project Overview

`demo-app-qa` is a full-stack insurance-claims management application composed of a Next.js web client and two Spring Boot services fronted by Keycloak for identity. Claimants can register, authenticate, submit claims through a multi-step wizard, and track their claim history. Administrators can review aggregate dashboard statistics and manage all claims across the system.

The platform is intentionally multi-layered (UI → BFF → domain service → data/event stores) so that quality must be assured at several independent seams. This strategy describes every automated and manual test level in use, why each exists, the classes of defects it is designed to catch, the exact commands used to run it, and the operational concerns (CI/CD, data, environments, risk) that keep the suite trustworthy.

---

## 2. Architecture

| Component | Technology | Port | Responsibilities |
|-----------|-----------|------|------------------|
| UI | Next.js 16 / React 19 | 3101 (prod) | Web client, claim wizard, admin dashboard, API proxy to BFF |
| BFF (Backend-for-Frontend) | Spring Boot 4.0.2, Java 21 | 8090 | Cookie-based auth, converts `access_token` cookie to `Bearer`, CSRF via `XSRF-TOKEN`, WebSocket at `/api/ws/claims`, calls Claims Service via a generated OkHttp client |
| Claims Service | Spring Boot 4.0.2, Java 21 | 8080 | Core domain logic, JPA/PostgreSQL persistence, Liquibase migrations, Kafka event publishing, Redis cache for dashboard stats |
| Keycloak | Keycloak 26 (realm `demo-app`) | 8180 | Identity provider, OIDC tokens, brute-force protection |
| PostgreSQL | PostgreSQL 15 | 5432 | Relational store for claims and users |
| Redis | Redis 7 | 6379 | Dashboard statistics cache |
| Kafka | Kafka | 9092 | Claim lifecycle event streaming |

### Architectural style

Both backend services follow a **hexagonal (ports & adapters)** architecture organised into:

- `adapter.in.web` — inbound HTTP/WebSocket controllers
- `adapter.out` — outbound adapters (persistence, Kafka, OkHttp clients, cache)
- `application` — use-case orchestration / ports
- `domain` — pure business model and rules

These boundaries are **enforced automatically by ArchUnit** tests, so architectural erosion (for example a domain class importing a web or persistence type) fails the build rather than drifting silently.

### Key endpoints

| Method | Path | Owner | Purpose |
|--------|------|-------|---------|
| POST | `/api/auth/signup` | BFF | Register a new claimant |
| POST | `/api/auth/login` | BFF | Authenticate, set auth cookies |
| POST | `/api/auth/refresh` | BFF | Refresh access token |
| GET / POST | `/api/claims` | BFF | List / create claims |
| GET | `/api/claims/{id}` | BFF | Claim details |
| GET | `/api/admin/dashboard/stats` | BFF | Aggregate admin statistics |
| GET | `/api/admin/claims` | BFF | Admin claim management list |
| POST / GET | `/api/users` | Claims Service (internal) | User provisioning / lookup |

### Seeded users

| Email | Password | Role |
|-------|----------|------|
| `claimant@demo.com` | `Claimant123!` | CLAIMANT |
| `admin@demo.com` | `Admin123!` | ADMIN |

---

## 3. Scope & Objectives

### Objectives

1. Verify every business-critical user journey (registration, authentication, claim submission, claim tracking, admin management) works end-to-end.
2. Catch defects at the **cheapest possible layer** — unit before integration, integration before E2E — to keep feedback fast and failure diagnosis precise.
3. Guarantee the **contract** between the BFF and the Claims Service stays compatible as either side evolves.
4. Enforce non-functional expectations: performance under load, security/authorization boundaries, and architectural integrity.
5. Provide objective, repeatable quality gates (coverage, mutation, static analysis) that block regressions in CI.

### In-scope

- All three application tiers (UI, BFF, Claims Service) and their integrations.
- Functional correctness, authorization/RBAC, API error handling.
- Contract compatibility (consumer-driven) between BFF and Claims Service.
- Performance smoke/load/stress profiles against the Claims path.
- Static code quality and mutation effectiveness.

### Out-of-scope

- Penetration testing / full security audit of Keycloak internals.
- Infrastructure provisioning, Kubernetes, and cloud deployment pipelines.
- Load testing beyond the defined stress profile (60 VUs).
- Accessibility (WCAG) and cross-browser matrix beyond Chromium.
- Localization / internationalization testing.
- Disaster recovery, backup, and data-migration rehearsal.

---

## 4. Test Levels

| Level | Tooling | Where it runs | Count (this session) |
|-------|---------|---------------|-----------------------|
| Backend unit | JUnit 5 + Mockito + AssertJ | JVM, no containers | Claims 197, BFF 217 |
| Integration | Testcontainers (PostgreSQL, Kafka, Keycloak, Redis) | Docker | Claims 8, BFF (RBAC + Kafka consumer) |
| Contract (Pact) | Pact JVM 4.6.3 | JVM / Testcontainers | 7 interactions |
| Frontend unit | Vitest + Testing Library | Node | 266 across 25 files |
| E2E | Playwright 1.65 (Chromium) | Browser against running stack | 19+ |
| Performance | k6 | CLI against running stack | smoke / load / stress |
| Static / quality gates | Checkstyle, PMD/CPD, JaCoCo, PIT | Maven build | gating |

Each level is detailed in sections 9–16.

---

## 5. Test Types

| Type | Levels used | Purpose |
|------|-------------|---------|
| Functional | Unit, integration, E2E, manual | Correct behaviour of features |
| Contract | Pact consumer + provider | Inter-service compatibility |
| Authorization / RBAC | Integration, E2E, manual | Role boundaries (claimant vs admin vs anonymous) |
| Performance | k6 | Latency and throughput under load |
| Regression | All automated levels in CI | Prevent reintroduction of defects |
| Structural / architectural | ArchUnit, PIT mutation | Design integrity and test effectiveness |
| Static analysis | Checkstyle, PMD/CPD | Style, bug patterns, duplication |
| Exploratory / manual | Manual scripts (`TEST_SCENARIOS.md`) | Human judgement on UX and edge cases |

---

## 6. Test Environment

| Concern | Setup |
|---------|-------|
| Local stack | Docker Compose brings up Keycloak 26, PostgreSQL 15, Redis 7, Kafka; services run on the ports in §2 |
| Integration tests | Testcontainers spins ephemeral PostgreSQL, Kafka, Keycloak, Redis per run — no shared mutable state |
| Timezone pinning | Integration test JVM is pinned to UTC (`-Duser.timezone=UTC`) because pgjdbc otherwise sends the legacy `Asia/Calcutta` zone id, which PostgreSQL rejects |
| E2E base URL | `http://localhost:3101` (production Next.js build) |
| Browser | Chromium (Playwright 1.65) |
| Identity | Keycloak realm `demo-app` with seeded users |

---

## 7. Test Data Strategy

- **Seeded users** (`claimant@demo.com`, `admin@demo.com`) provide stable, role-specific accounts for E2E and manual runs.
- **Integration tests** create and tear down their own data inside ephemeral Testcontainers, so each run starts clean and is isolated from other runs and from developer machines.
- **Pact provider verification** seeds the database via `@State` handlers and uses a **contract-test Spring profile** that injects a fixed JWT subject `550e8400-e29b-41d4-a716-446655440000`, making provider states deterministic and independent of a live identity provider.
- **Frontend unit tests** mock network calls, so no backend data is required.
- **k6** authenticates once and reuses the token to avoid polluting Keycloak brute-force counters (see Risk, §22).
- No production data is ever used; all fixtures are synthetic.

---

## 8. Automation Framework Architecture

- **Backend**: Maven multi-module build. Surefire runs unit tests by default and **excludes** `@Tag("integration")` via `surefire.excludedGroups=integration`; integration runs re-enable the tag explicitly. ArchUnit guards hexagonal boundaries.
- **Contract**: Pact consumer tests (BFF) generate a pact file consumed by provider verification (Claims Service), decoupling the two deploy cadences.
- **Frontend**: Vitest + Testing Library for component/logic units; `tsc --noEmit` for type safety; `next build` for build-time validation.
- **E2E**: Playwright with the **Page Object Model** and a shared **auth fixture** so tests express intent, not selectors, and reuse authenticated sessions.
- **Performance**: k6 scripts parameterised into smoke/load/stress profiles with shared check assertions.

---

## 9. Unit Testing Strategy

**Why it exists:** Unit tests are the fastest feedback loop and run without any infrastructure. They pin down domain rules, mappers, validators, use-case orchestration, and React component logic in isolation.

**Defects caught:** incorrect business logic, boundary/validation errors, broken mapping between layers, regression in pure functions, component rendering/branching bugs — all before the cost of spinning up containers or a browser.

| Suite | Framework | Result (this session) |
|-------|-----------|------------------------|
| Claims Service unit | JUnit 5 + Mockito + AssertJ | **197 passing** |
| BFF unit | JUnit 5 + Mockito + AssertJ | **217 passing** |
| Frontend unit | Vitest + Testing Library | **266 passing across 25 files** |

**Run commands:**

```bash
# Backend unit (excludes @Tag("integration") by default)
mvn test

# Frontend unit
npm run test

# Frontend type safety
npx tsc --noEmit        # 0 errors

# Frontend production build
next build
```

---

## 10. Integration Testing Strategy (Testcontainers)

**Why it exists:** Unit tests mock collaborators; integration tests prove the service works against **real** PostgreSQL, Kafka, Keycloak, and Redis. They validate JPA mappings, Liquibase migrations, Kafka publish/consume wiring, cache behaviour, and security configuration that only manifests against real infrastructure.

**Defects caught:** broken SQL/JPA mappings, migration failures, serialization mismatches on Kafka, cache misconfiguration, and security filter wiring errors — things no mock can reveal.

| Suite | Scope | Result |
|-------|-------|--------|
| Claims Service | `ClaimRepositoryIntegrationTest` (6), `ClaimsServiceApplicationTests`, `HealthCheckIntegrationTest` | **8 passing** |
| BFF | `RbacIntegrationTest`, `ClaimEventKafkaConsumerIntegrationTest` | passing |

Tests are tagged `@Tag("integration")` and the test JVM is pinned to UTC to avoid the pgjdbc `Asia/Calcutta` rejection.

**Run command:**

```bash
mvn test -Dsurefire.excludedGroups= -Dgroups=integration
```

---

## 11. Pact Contract Testing Strategy

**Why it exists:** The BFF calls the Claims Service over HTTP via a generated OkHttp client. Consumer-driven contract testing lets the two services evolve independently while guaranteeing the request/response shapes they exchange stay compatible — without a slow, brittle end-to-end integration for every change.

**Defects caught:** breaking changes to request/response payloads, status codes, or field names between the two services; drift between what the consumer expects and what the provider actually returns.

- **Consumer (BFF):** `ClaimsServiceConsumerPactTest` defines **7 interactions** and generates `bff-service/pacts/bff-service-claims-service.json`.
- **Provider (Claims Service):** `ClaimsServiceProviderPactTest` (tagged `@Tag("integration")`) verifies the 7 interactions using the **contract-test Spring profile** (fixed JWT subject `550e8400-e29b-41d4-a716-446655440000`) and `@State` DB seeding.

| # | Interaction | Expected status |
|---|-------------|-----------------|
| 1 | Create claim | 201 |
| 2 | List claims | 200 |
| 3 | Get claim | 200 |
| 4 | Get claim (missing) | 404 |
| 5 | Get claim (forbidden) | 403 |
| 6 | Create user | 201 |
| 7 | Create user (duplicate) | 409 |

**Run commands:**

```bash
# Consumer: generate the pact
mvn test -pl bff-service -Dtest=ClaimsServiceConsumerPactTest

# Provider: verify the pact (integration-tagged)
mvn test -Dsurefire.excludedGroups= -Dgroups=integration -Dtest=ClaimsServiceProviderPactTest
```

---

## 12. E2E Strategy

**Why it exists:** End-to-end tests exercise the fully assembled stack through the real browser, validating that UI, BFF, Claims Service, Keycloak, and data stores cooperate to deliver complete user journeys.

**Defects caught:** broken navigation, cookie/CSRF handling, proxy header forwarding, wizard state management, RBAC enforcement at the UI, and cross-tier integration bugs that unit/integration layers cannot see.

- **Tooling:** Playwright 1.65, Chromium, Page Object Model, shared auth fixture.
- **Coverage:** **19+ tests** across `auth.spec.ts`, `claims.spec.ts`, `admin.spec.ts`.
- **Base URL:** `http://localhost:3101`.
- E2E uses a **login retry** to tolerate Keycloak brute-force rejection of concurrent same-account logins (see §22).

**Run command:**

```bash
npx playwright test
```

---

## 13. Performance Testing Strategy

**Why it exists:** Functional correctness says nothing about behaviour under concurrency. k6 profiles establish a latency/throughput baseline and surface regressions.

**Defects caught:** latency regressions, throughput ceilings, resource contention, and failures that only appear under concurrent load.

| Profile | VUs | Result (this session) |
|---------|-----|------------------------|
| Smoke | 1 | 100% checks, p95 ≈ 288 ms |
| Load | 10 | 100% checks, 0% failures, p95 ≈ 59 ms, ~7.5 req/s |
| Stress | 60 | 100% checks, 0% failures, p95 ≈ 113 ms, p99 ≈ 200 ms, ~31 req/s |

Scripts live under `performance/k6`. k6 **authenticates once** to avoid tripping Keycloak brute-force protection with naive repeated logins.

**Run command (example):**

```bash
k6 run performance/k6/<profile>.js
```

---

## 14. Manual Testing Strategy

**Why it exists:** Automated suites assert expected behaviour; humans find UX issues, ambiguous messaging, and edge cases not yet automated. Manual scripts also serve as a repeatable acceptance checklist and onboarding documentation.

The execution-ready manual scripts are maintained in [`TEST_SCENARIOS.md`](./TEST_SCENARIOS.md), covering registration/authentication, claim creation, listing/details, admin dashboard, authorization, and API error handling with positive, negative, boundary, and authorization cases. Manual runs are tracked with explicit Status and Actual Result columns.

---

## 15. CI/CD Integration

A GitHub Actions pipeline at **`.github/workflows/ci.yml`** runs the following stages, gating merges on quality:

| # | Stage | What it runs |
|---|-------|--------------|
| 1 | Backend unit | `mvn test` for both services |
| 2 | Frontend unit | `npm run test` |
| 3 | TypeScript | `npx tsc --noEmit` |
| 4 | Build | `next build` + Maven package |
| 5 | Testcontainers integration | `mvn test -Dsurefire.excludedGroups= -Dgroups=integration` |
| 6 | Pact consumer | generate pact from BFF |
| 7 | Pact provider | verify pact in Claims Service |
| 8 | Playwright E2E | `npx playwright test` |
| 9 | k6 smoke | smoke profile |

Static-analysis and coverage/mutation gates (§16) run as part of the Maven stages and fail the build when thresholds are not met.

---

## 16. Static Analysis & Quality Gates

| Gate | Tool | Threshold |
|------|------|-----------|
| Style | Checkstyle | enforced |
| Bug patterns | PMD | enforced |
| Duplication | CPD | enforced |
| Coverage | JaCoCo | **90% line + branch** |
| Mutation | PIT | **80%** |
| Architecture | ArchUnit | hexagonal boundaries enforced |

---

## 17. Entry Criteria

- Code compiles and the application builds (`next build`, Maven package succeed).
- Required infrastructure (Docker, Keycloak realm, seeded users) is available for the relevant level.
- Unit tests pass before integration tests are run; integration passes before E2E.
- Test data fixtures and Spring profiles (e.g. contract-test) are configured.

---

## 18. Exit Criteria

- All automated suites pass: backend unit (Claims 197, BFF 217), frontend unit (266), integration (Claims 8 + BFF), Pact (7 interactions consumer + provider), E2E (19+).
- Coverage ≥ 90% line+branch (JaCoCo); mutation ≥ 80% (PIT).
- No Checkstyle/PMD/CPD violations; ArchUnit passes.
- Performance within baseline (stress p95 ≈ 113 ms, 0% failures).
- No open Critical or High defects; all known defects documented (§22).

---

## 19. Defect Management

- Defects are classified by severity (Critical / High / Medium / Low) and reproduced with a failing automated test wherever feasible, so the fix is guarded against regression.
- Each fix is verified by re-running the relevant level in CI.
- Known defects and their fixes/mitigations are tracked in §22.

---

## 20. Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| Developers | Write and maintain unit, integration, and contract tests alongside features |
| QA Engineers | Own E2E, manual scripts, performance profiles, and overall strategy |
| Tech Lead | Approves quality gates and architectural (ArchUnit) rules |
| DevOps | Maintains CI pipeline and test infrastructure |
| Release Manager | Verifies exit criteria before release |

---

## 21. Test Metrics & Reporting

| Metric | Source | Current |
|--------|--------|---------|
| Unit test count/pass | Surefire / Vitest | Claims 197, BFF 217, FE 266 |
| Integration pass | Surefire | Claims 8, BFF passing |
| Contract interactions | Pact | 7 |
| E2E pass | Playwright | 19+ |
| Line + branch coverage | JaCoCo | ≥ 90% gate |
| Mutation score | PIT | ≥ 80% gate |
| Performance p95/p99 | k6 | load p95 ≈ 59 ms; stress p95 ≈ 113 ms / p99 ≈ 200 ms |

Reports are produced by each tool (Surefire/Vitest XML, JaCoCo HTML, PIT HTML, Playwright HTML, k6 summary) and published from CI.

---

## 22. Risk Assessment & Known Limitations

### Known defects found & fixed this session

| # | Defect | Impact | Resolution |
|---|--------|--------|------------|
| 1 | Next.js API proxy forwarded an empty `Authorization` header | BFF returned 401 | Only forward the header when present |
| 2 | Claim-cancel dialog didn't detect typed-but-unsubmitted data | Users lost work without warning | Live-sync wizard form to the Zustand store |
| 3 | Admin dashboard stat value lacked a test id | Not reliably testable | Added `data-testid` |
| 4 | Keycloak brute-force "quick login" rejects concurrent logins of the same account | Breaks parallel E2E admin tests and naive load tests | Mitigated with login retry in E2E and authenticate-once in k6 |
| 5 | pgjdbc `Asia/Calcutta` timezone rejected by PostgreSQL in integration tests | Integration failures | Pinned test JVM to UTC (`-Duser.timezone=UTC`) |

### Residual risks & limitations

- Keycloak brute-force protection limits parallel same-account testing; mitigations are in place but concurrency with a single account remains constrained.
- E2E and performance coverage is Chromium-only; other browsers and accessibility are out of scope.
- Performance validated only up to the 60-VU stress profile.
- No full security/penetration testing of the identity layer.
