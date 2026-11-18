# Prompt Library — Registry

Central index of reusable QA prompts for the **demo-app-qa** project. Each prompt is a
self-contained, reusable brief for a Copilot Agent session. Start any session by reading
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and [COPILOT_WORKING_GUIDELINES.md](COPILOT_WORKING_GUIDELINES.md).

## Registry

| ID | Name | Objective | Status | Version | File |
| --- | --- | --- | --- | --- | --- |
| QA-001 | Assessment planning & architecture | Read-only analysis + implementation plan | Executed | 1.0 | [01-assessment-planning.md](01-assessment-planning.md) |
| QA-002 | Unit testing | Keep unit suites green + add meaningful coverage | Executed | 1.0 | [02-unit-testing.md](02-unit-testing.md) |
| QA-003 | Testcontainers integration | Real-container integration tests | Executed · RECONSTRUCTED | 1.0 | [03-testcontainers.md](03-testcontainers.md) |
| QA-004 | Pact contract testing | Consumer-driven BFF↔Claims contracts | Executed · RECONSTRUCTED | 1.0 | [04-pact-contract-testing.md](04-pact-contract-testing.md) |
| QA-005 | Playwright E2E | POM E2E user journeys | Executed | 1.0 | [05-playwright-e2e.md](05-playwright-e2e.md) |
| QA-006 | k6 performance | smoke/load/stress perf suite | Executed · RECONSTRUCTED | 1.0 | [06-k6-performance.md](06-k6-performance.md) |
| QA-007 | Documentation & knowledge mgmt | Strategy, manual scripts, consolidation | Executed | 1.0 | [07-documentation.md](07-documentation.md) |
| QA-008 | Final verification & evidence audit | Verify claims vs real output | Executed | 1.0 | [08-final-verification.md](08-final-verification.md) |

**Status legend:** *Executed* = used and run this project · *RECONSTRUCTED* = reusable wording
synthesized from a combined assessment prompt (not verbatim original; see each file).

## When to use which
- **Starting fresh / onboarding** → QA-001, then QA-002.
- **Adding backend depth** → QA-003 (integration), QA-004 (contracts).
- **UI / journeys** → QA-005.
- **Performance** → QA-006.
- **Docs / handover** → QA-007.
- **Before declaring done** → QA-008.

## Naming conventions
- IDs are unique and sequential: `QA-001` … `QA-008`. New prompts get the next ID (`QA-009`, …).
- Filenames: `NN-topic.md` (two-digit order + kebab-case topic).
- Each prompt file includes: Prompt ID, Name, Version, Status, Execution status, Objective,
  Context & prerequisites, Reusable prompt text, Execution steps, Verification, Related files.

## Originals
The pre-consolidation prompt files are preserved verbatim in [archive/](archive/):
`01_Repo_Analysis.md`, `02_claims_service_baseline.md`, `03_Fix_claims_service.md`,
`04_investigate_remaining_test_failure.md`, `05_fix_failures.md`, `06_Clain_Final_Fix`,
`07_Playwright_Setup.md`, `Fix_Playwright_Script.md`.
