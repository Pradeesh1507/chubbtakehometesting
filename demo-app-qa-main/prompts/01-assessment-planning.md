# QA-001 — Assessment Planning & Architecture Analysis

- **Prompt ID:** QA-001
- **Name:** Assessment planning & repository/architecture analysis
- **Version:** 1.0
- **Status:** ACTIVE. Derived from the archived original `prompts/archive/01_Repo_Analysis.md`
  plus the Part-1 "Complete QA Assessment" mission prompt actually used this project.
- **Execution status:** Executed (architecture + gap analysis produced; see
  `docs/archive/REPOSITORY_ANALYSIS.md` and `docs/FINAL_QA_ASSESSMENT_REPORT.md`).

## Objective
Produce a read-only understanding of the system and a prioritised test-implementation plan
before any code is written.

## Context & prerequisites
- Read `docs/PROJECT_CONTEXT.md` and `ARCHITECTURE.md` first.
- Three-tier app (Next.js UI, BFF, Claims Service) + Keycloak/Postgres/Redis/Kafka.
- Do not assume a feature exists merely because its config/scaffolding exists.

## Reusable prompt text
```
Act as a Senior QA Automation Architect for the Insurance Claims demo (Next.js UI, Spring Boot
BFF, Spring Boot Claims Service, PostgreSQL, Redis, Kafka, Keycloak, optional Debezium CDC).

Analyse the ACTUAL repository (read-only) and report:
1. Architecture and each component's responsibilities.
2. Existing unit / integration (Testcontainers) / Pact / Playwright / performance coverage.
3. Broken, incomplete or disabled tests.
4. OpenAPI / AsyncAPI specs.
5. Missing QA coverage vs the assessment requirements.

Output: Architecture Overview, Existing Test Infrastructure, Existing Coverage, Gaps, Risks,
Recommended Implementation Plan.

Rules: analyse real files; do not modify anything; do not generate implementation code;
distinguish implemented vs scaffolded vs missing; do not claim a feature works without evidence.
```

## Execution steps
1. Inventory `code/**`, `pom.xml` files, `package.json`, test dirs, OpenAPI specs.
2. Classify each test layer as implemented / scaffolded / missing.
3. Draft the implementation plan (unit → integration → contract → E2E → performance → docs/CI).

## Verification
- Findings cite real files; no implementation claims without evidence.

## Related files
- `ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`, `docs/archive/REPOSITORY_ANALYSIS.md`
- Archived original: `prompts/archive/01_Repo_Analysis.md`
