# QA Documentation Hub

Single entry point for the **demo-app-qa** (Insurance Claims Management) quality knowledge base.
Start here, then follow the links below.

> **Current verified status (2026-11-17):** Backend Claims unit **197**; BFF **228**
> (207 unit + 7 Pact consumer + 14 integration); Claims Testcontainers integration **8**;
> Pact **7 consumer / 7 provider verified**; Frontend Vitest **268**; TypeScript **0 errors**;
> production build **SUCCESS**; Playwright E2E **24/24** (3 consecutive runs); k6 smoke/load/stress
> **100% checks, 0% errors**. See `TEST_EXECUTION_REPORT.md` for commands + evidence.

## 1. Project at a glance

Three-tier microservices app: **Next.js UI** → **BFF (Spring Boot 4)** → **Claims Service
(Spring Boot 4)** → **PostgreSQL/Kafka**, with **Keycloak** OAuth2 and **Redis** cache.
Full detail in [../ARCHITECTURE.md](../ARCHITECTURE.md).

## 2. Read these first

| Audience | Start with |
| --- | --- |
| New QA engineer | This file → [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) → [TEST_STRATEGY.md](TEST_STRATEGY.md) |
| New Copilot Agent session | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) → [../prompts/COPILOT_WORKING_GUIDELINES.md](../prompts/COPILOT_WORKING_GUIDELINES.md) → relevant prompt in [../prompts/README.md](../prompts/README.md) |
| Reviewer / stakeholder | [FINAL_QA_ASSESSMENT_REPORT.md](FINAL_QA_ASSESSMENT_REPORT.md) + [FINAL_ASSESSMENT_EVIDENCE_AUDIT.md](FINAL_ASSESSMENT_EVIDENCE_AUDIT.md) |

## 3. Canonical documents

### Strategy & planning
- [TEST_STRATEGY.md](TEST_STRATEGY.md) — all test levels, environment, data, entry/exit criteria, risks, metrics (the *what* and *why*).
- [TEST_SCENARIOS.md](TEST_SCENARIOS.md) — execution-ready manual test cases (Not Executed).
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — onboarding brief: structure, ports, commands, decisions, limitations.

### Results & evidence
- [TEST_EXECUTION_REPORT.md](TEST_EXECUTION_REPORT.md) — latest verified counts, commands, evidence links.
- [FINAL_QA_ASSESSMENT_REPORT.md](FINAL_QA_ASSESSMENT_REPORT.md) — full assessment summary + defects.
- [FINAL_ASSESSMENT_EVIDENCE_AUDIT.md](FINAL_ASSESSMENT_EVIDENCE_AUDIT.md) — independent verification of every claim.
- [INTEGRATION_TEST_REPORT.md](INTEGRATION_TEST_REPORT.md) · [PACT_CONTRACT_TEST_REPORT.md](PACT_CONTRACT_TEST_REPORT.md) · [PERFORMANCE_TEST_REPORT.md](PERFORMANCE_TEST_REPORT.md) — per-layer results.

### Implementation guides (the *how*)
- [implementation/TESTCONTAINERS.md](implementation/TESTCONTAINERS.md)
- [implementation/PACT_CONTRACT_TESTING.md](implementation/PACT_CONTRACT_TESTING.md)
- [implementation/PLAYWRIGHT_FRAMEWORK.md](implementation/PLAYWRIGHT_FRAMEWORK.md)
- [implementation/PERFORMANCE_TESTING.md](implementation/PERFORMANCE_TESTING.md)
- [implementation/CI_CD_TESTING.md](implementation/CI_CD_TESTING.md)

### Prompt library
- [../prompts/README.md](../prompts/README.md) — prompt registry (QA-001 … QA-008).
- [../prompts/COPILOT_WORKING_GUIDELINES.md](../prompts/COPILOT_WORKING_GUIDELINES.md) — mandatory working protocol.

### Evidence & history
- [evidence/README.md](evidence/README.md) — index of raw execution evidence (kept in place).
- [archive/](archive/) — superseded session reports & analyses (historical, point-in-time).
- [DOCUMENTATION_INVENTORY.md](DOCUMENTATION_INVENTORY.md) · [DOCUMENTATION_CONSOLIDATION_REPORT.md](DOCUMENTATION_CONSOLIDATION_REPORT.md)

## 4. Quick commands

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
cd code\claims-service ; mvn test            # Claims unit (197)
cd code\bff-service    ; mvn test            # BFF unit + Pact consumer
cd code\demo-app-ui    ; npm run test        # Vitest (268)
cd code\demo-app-ui    ; npx playwright test # E2E (24) — needs stack + UI on 3101
```

Integration / Pact / performance commands: see [TEST_EXECUTION_REPORT.md](TEST_EXECUTION_REPORT.md)
and the implementation guides.
