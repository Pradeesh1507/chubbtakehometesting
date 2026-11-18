# Project Context — Onboarding Brief

Essential context for a new QA engineer **or a new Copilot Agent session** to continue work
without the previous chat history. Read this first, then
[../prompts/COPILOT_WORKING_GUIDELINES.md](../prompts/COPILOT_WORKING_GUIDELINES.md).

## 1. What this project is

**demo-app-qa** — an Insurance Claims Management demo used as a QA assessment platform.
Three-tier microservices with OAuth2, event streaming and a BFF gateway. The application is
functional; the QA work adds and verifies tests across every layer.

## 2. Repository structure

```
demo-app-qa-main/
├── code/
│   ├── claims-service/      # Spring Boot 4 core domain (JPA/Postgres, Kafka, Redis)
│   ├── bff-service/         # Spring Boot 4 backend-for-frontend (gateway, WS, auth)
│   └── demo-app-ui/         # Next.js 16 / React 19 UI (+ Vitest + Playwright)
├── docker/compose/          # Keycloak realm + infra config
├── docker-compose.infra.yml # Postgres, Redis, Kafka, Keycloak, Zookeeper, Kafka UI
├── docker-compose.apps.yml  # claims-service, bff-service, ui
├── performance/k6/          # k6 performance suite (smoke/load/stress)
├── .github/workflows/ci.yml # CI pipeline (8 jobs)
├── docs/                    # Canonical docs + implementation guides + archive
├── prompts/                 # Reusable prompt library + registry
├── ARCHITECTURE.md, README.md  # Original app docs
└── ai-journal.md            # Append-only AI working journal
```

## 3. Technology stack

| Layer | Tech | Version |
| --- | --- | --- |
| UI | Next.js / React | 16.1.6 / 19.2.3 |
| BFF & Claims | Spring Boot / Java | 4.0.2 / 21 |
| Auth | Keycloak (realm `demo-app`) | 26 |
| DB | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Streaming | Apache Kafka | — |
| Build | Maven 3.9.8, npm 10.9.2 | — |
| Perf | k6 | 0.55.2 |

## 4. Service ports

| Service | Port | Notes |
| --- | --- | --- |
| Claims Service | 8080 | REST + actuator |
| BFF Service | 8090 | REST + WebSocket; cookie→Bearer auth; CSRF |
| Keycloak | 8180 | OAuth2/OIDC |
| PostgreSQL | 5432 | |
| Redis | 6379 | internal |
| Kafka | 9092 | |
| Kafka UI | 9093 | |
| **UI (dev)** | **3001** | `npm run dev` (original app default) |
| **UI (QA/E2E prod)** | **3101** | `npx next start -p 3101` — Playwright `baseURL` |

> **Important delta vs original README/ARCHITECTURE:** QA E2E runs the UI in **production mode on
> 3101** (not dev 3001). Playwright `reuseExistingServer:true` reuses a server already on 3101.

## 5. Seeded accounts (Keycloak `demo-app` realm)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.com` | `Admin123!` |
| Claimant | `claimant@demo.com` | `Claimant123!` |

## 6. Startup (Windows / PowerShell)

Reuse already-healthy containers where possible.

```powershell
# Infra + backend (if not already running)
docker compose -f docker-compose.infra.yml up -d
docker compose -f docker-compose.apps.yml up -d

# UI in production mode on 3101 (for E2E)
cd code\demo-app-ui ; npm run build ; npx next start -p 3101

# Health
curl http://localhost:8080/actuator/health   # Claims
curl http://localhost:8090/actuator/health   # BFF
curl http://localhost:3101                     # UI
```

## 7. Test commands

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'

# Backend unit (integration excluded by default via surefire.excludedGroups=integration)
cd code\claims-service ; mvn test                 # 197
cd code\bff-service    ; mvn test                 # unit + 7 Pact consumer

# Integration (Testcontainers — Docker required)
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"   # 8
cd code\bff-service    ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration"

# Pact consumer -> provider
cd code\bff-service    ; mvn test "-Dtest=ClaimsServiceConsumerPactTest"
Copy-Item code\bff-service\pacts\*.json code\claims-service\src\test\resources\pacts\ -Force
cd code\claims-service ; mvn test "-Dsurefire.excludedGroups=" "-Dgroups=integration" "-Dtest=ClaimsServiceProviderPactTest"

# Frontend
cd code\demo-app-ui ; npm run test ; npx tsc --noEmit ; npm run build

# E2E (UI on 3101)
cd code\demo-app-ui ; npx playwright test

# Performance (k6)
k6 run performance\k6\smoke-test.js
k6 run performance\k6\load-test.js
```

## 8. Latest verified results (2026-11-17)

| Suite | Result |
| --- | --- |
| Claims unit | 197 passed |
| BFF all (unit + consumer + integration) | 228 passed (207 + 7 + 14) |
| Claims integration (Testcontainers) | 8 passed |
| Pact consumer / provider | 7 / 7 verified |
| Frontend Vitest | 268 passed |
| TypeScript / build | 0 errors / SUCCESS |
| Playwright E2E | 24/24 (×3 runs) |
| k6 smoke / load / stress | 100% checks, 0% errors |

## 9. Key implementation decisions

- **Test JVM pinned to UTC** (`-Duser.timezone=UTC` in each pom's surefire `argLine`) — avoids
  PostgreSQL rejecting the legacy `Asia/Calcutta` zone and makes tests deterministic.
- **Integration tests tagged `@Tag("integration")`** and excluded from default `mvn test`;
  run explicitly with `-Dsurefire.excludedGroups= -Dgroups=integration`.
- **Pact:** file-based workflow (no broker). Consumer generates `bff-service/pacts/…json`;
  provider verifies with the `contract-test` Spring profile (injects a fixed JWT subject
  `550e8400-…000`) and `@State` DB seeding. Main `SecurityConfig.filterChain` is
  `@Profile("!contract-test")` so the contract-test chain replaces it.
- **Frontend API proxy** (`app/api/*/route.ts`) forwards `Authorization` only when present
  (empty header broke BFF cookie auth) and sends `X-XSRF-TOKEN` on logout (CSRF).
- **E2E auth fixture** retries login on Keycloak's transient brute-force "quick login" 401.
- **k6** authenticates once in `setup()` and reuses the session (avoids brute-force throttle).

## 10. Known limitations

- **CI pipeline not executed** here (no CI runner); YAML validated, commands proven locally.
- **Not a Git repository** — no diff available; change lists are inspection-derived.
- **Keycloak brute-force quick-login** limits concurrent shared-account logins (mitigated).
- **Realtime WebSocket** shows "Reconnecting…" (pre-existing; no test impact).
- **k6 stress** reached the safe 60-VU ceiling with no degradation — saturation not forced.

## 11. Guardrails for changes

- Do **not** modify application behaviour, test assertions, or Docker config for documentation
  or convenience tasks.
- Preserve passing tests; run tests after changes; record **actual** results (never claim a
  pass without execution output).
- Append to `ai-journal.md`; update the relevant canonical doc; avoid duplicate docs.

## 12. Pointers
- Architecture: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- Strategy: [TEST_STRATEGY.md](TEST_STRATEGY.md) · Execution: [TEST_EXECUTION_REPORT.md](TEST_EXECUTION_REPORT.md)
- Implementation guides: [implementation/](implementation/)
- Prompts: [../prompts/README.md](../prompts/README.md)
