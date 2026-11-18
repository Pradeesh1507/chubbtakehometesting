# Documentation Inventory

**Generated:** 2026-11-17 (read-only inventory phase — no files modified during inventory).
**Scope:** every Markdown/text document under `docs/`, `prompts/`, and the repository root,
plus test-evidence locations.

Legend — **Category:** Strategy / Architecture / Implementation / Evidence / Prompt / Historical ·
**Status:** Current / Historical / Duplicate / Incomplete ·
**Recommendation:** Keep (canonical) / Keep / Merge / Archive / Reference.

> This inventory drove the consolidation performed in later phases
> (see `docs/DOCUMENTATION_CONSOLIDATION_REPORT.md`). After consolidation, files marked
> *Archive* live under `docs/archive/` or `prompts/archive/`.

---

## A. Canonical QA documents (`docs/`) — KEEP

| File | Category | Purpose | Status | Recommendation |
| --- | --- | --- | --- | --- |
| FINAL_QA_ASSESSMENT_REPORT.md | Strategy/Evidence | Final assessment summary (both phases), defects, results, limitations | Current | **Keep (source of truth — assessment)** |
| FINAL_ASSESSMENT_EVIDENCE_AUDIT.md | Evidence | Read-only audit verifying every claim against actual output | Current | Keep (canonical — audit) |
| TEST_STRATEGY.md | Strategy | What/why for all test levels, env, data, criteria, risks, metrics | Current | Keep (canonical) |
| TEST_SCENARIOS.md | Strategy | ~38 execution-ready manual test cases (Not Executed) | Current | Keep (canonical) |
| TEST_EXECUTION_REPORT.md | Evidence | Latest verified counts, commands, evidence links | Current | Keep (canonical) |
| INTEGRATION_TEST_REPORT.md | Evidence | Testcontainers integration results + TZ fix | Current | Keep (pairs with implementation guide) |
| PACT_CONTRACT_TEST_REPORT.md | Evidence | Pact consumer/provider results (7/7) | Current | Keep (pairs with implementation guide) |
| PERFORMANCE_TEST_REPORT.md | Evidence | k6 smoke/load/stress metrics | Current | Keep (pairs with implementation guide) |

## B. Canonical documents created during consolidation (`docs/`) — NEW

| File | Category | Purpose |
| --- | --- | --- |
| README.md | Architecture | Documentation hub / overview / links |
| PROJECT_CONTEXT.md | Architecture | Onboarding brief for future Copilot Agent sessions |
| implementation/TESTCONTAINERS.md | Implementation | How integration tests work (config, commands, troubleshooting) |
| implementation/PACT_CONTRACT_TESTING.md | Implementation | How Pact consumer/provider works |
| implementation/PLAYWRIGHT_FRAMEWORK.md | Implementation | POM, fixtures, specs, auth, run |
| implementation/PERFORMANCE_TESTING.md | Implementation | k6 structure, profiles, execution |
| implementation/CI_CD_TESTING.md | Implementation | GitHub Actions pipeline stages |
| evidence/README.md | Evidence | Index pointing to raw evidence (kept in place) |
| DOCUMENTATION_INVENTORY.md | — | This inventory |
| DOCUMENTATION_CONSOLIDATION_REPORT.md | — | Consolidation summary (Phase 8) |

## C. Root application documents — KEEP (at root)

| File | Category | Purpose | Status | Recommendation |
| --- | --- | --- | --- | --- |
| README.md (root) | Architecture | Original app README (setup/startup, dev on 3001) | Current* | Keep; `docs/PROJECT_CONTEXT.md` records QA deltas (UI prod on 3101; test layers now implemented) |
| ARCHITECTURE.md (root) | Architecture | Original app architecture (3-tier, CDC, ports) | Current* | Keep; referenced by canonical docs |
| ai-journal.md (root) | Historical | AI working journal (sessions 12–14) | Current | Keep (append-only journal); counts inside are per-session snapshots |

\* The root README/ARCHITECTURE predate the QA work and contain a few stale statements
(UI port `3001` for dev vs `3101` for the QA/Playwright prod server; "E2E/contract/integration
scaffolded — empty", now implemented; Keycloak version string). These originals are preserved
unchanged; `docs/PROJECT_CONTEXT.md` is the authoritative QA-current reference.

## D. Historical session / analysis reports (`docs/`) — ARCHIVE

All of the following are point-in-time session artefacts, superseded by the canonical set.
Several contain **outdated test counts** (e.g. "BFF 217", "Vitest 266", "19 E2E", "16 E2E
failing") — valid for their session, not current. Recommendation: **Archive** to `docs/archive/`.

| File | Category | Notes (why historical) |
| --- | --- | --- |
| BASELINE_TEST_REPORT.md | Historical | Early baseline counts |
| REPOSITORY_ANALYSIS.md | Historical | Initial repo analysis (superseded by ARCHITECTURE/PROJECT_CONTEXT) |
| INTERVIEW_SUMMARY.md | Historical | Narrative summary |
| QUICK_START_VALIDATION.md | Historical | Early validation steps |
| CODE_CHANGES_SUMMARY.md | Historical | Early code-change log |
| CLAIMS_SERVICE_FAILURE_ANALYSIS.md | Historical | Claims-service debugging |
| CLAIMS_SERVICE_TEST_FIX.md | Historical | Claims-service fix log |
| CLAIMS_SERVICE_REMAINING_TEST_FIXES.md | Historical | Claims-service fix log |
| CLAIMS_SERVICE_FINAL_VALIDATION_REPORT.md | Historical | Claims-service validation (197) |
| CREATE_CLAIM_EVENT_FAILURE_ANALYSIS.md | Historical | Kafka event debugging |
| DUPLICATE_USER_CREATION_ROOT_CAUSE.md | Historical | Duplicate-user root cause |
| KEYCLOAK_ADMIN_AUTHENTICATION_ROOT_CAUSE.md | Historical | Keycloak admin auth RCA |
| KEYCLOAK_FIX_QUICK_REFERENCE.md | Historical | Keycloak fix quick ref |
| VITEST_FAILURES_FIXED.md | Historical | Frontend test fix log (266) |
| PLAYWRIGHT_DIAGNOSIS_SUMMARY.md | Historical | E2E diagnosis |
| PLAYWRIGHT_E2E_FAILURE_ANALYSIS_AND_FIXES.md | Historical | E2E failure analysis |
| PLAYWRIGHT_E2E_REPORT.md | Historical | E2E report (older counts) |
| PLAYWRIGHT_SIGNUP_NETWORK_FAILURE_DIAGNOSIS.md | Historical | Signup/network RCA |
| SESSION_05_CODE_CHANGES.md | Historical | Session 05 |
| SESSION_09_INVESTIGATION_SUMMARY.md | Historical | Session 09 |
| SESSION_09_WORK_SUMMARY.md | Historical | Session 09 |
| SESSION_11_DUPLICATE_USER_CREATION_FIX.md | Historical | Session 11 |
| SESSION_11_EXECUTIVE_SUMMARY.md | Historical | Session 11 |
| SESSION_12_CONTINUATION_FINDINGS.md | Historical | Session 12 |
| SESSION_12_REMEDIATION_PROGRESS.md | Historical | Session 12 |
| SESSION_12_STAGE_6_FINAL_STATUS.md | Historical | Session 12 |
| SESSION_12_STAGE_COMPLETION_REPORT.md | Historical | Session 12 |
| SESSION_13_E2E_ROOT_CAUSE_REPORT.md | Historical | Session 13 RCA (API proxy) |
| SESSION_13_INVESTIGATION_SUMMARY.md | Historical | Session 13 |
| SESSION_14_E2E_REMEDIATION_REPORT.md | Historical | Session 14 |
| SESSION_14_REMAINING_ISSUES_ANALYSIS.md | Historical | Session 14 |
| SESSION_15_FINAL_E2E_REMEDIATION_REPORT.md | Historical | Session 15 |
| SESSION_16_FINAL_CONTINUATION_SUMMARY.md | Historical | Session 16 |

## E. Historical documents at repository root — ARCHIVE

| File | Category | Notes |
| --- | --- | --- |
| PLAYWRIGHT_E2E_FIXES_COMPLETE.md | Historical | Older E2E fix log |
| PLAYWRIGHT_IMPLEMENTATION_SUMMARY.md | Historical | Older E2E summary |
| PLAYWRIGHT_LOCATOR_FIXES_ANALYSIS.md | Historical | Locator analysis |
| PLAYWRIGHT_LOCATOR_FIXES_COMPLETE.md | Historical | Locator fixes |
| PLAYWRIGHT_LOCATOR_FIXES_IMPLEMENTATION.md | Historical | Locator fixes |
| PLAYWRIGHT_VERIFICATION_CHECKLIST.md | Historical | E2E checklist |
| SESSION_14_COMPLETION_SUMMARY.txt | Historical | Tiny session note |
| SESSION_16_QUICK_STATUS.txt | Historical | Session 16 status |

## F. Prompts (`prompts/`)

| File | Category | Status | Recommendation |
| --- | --- | --- | --- |
| 01_Repo_Analysis.md | Prompt | Historical original | Merge → `QA-001` (archive original) |
| 02_claims_service_baseline.md | Prompt | Historical original | Merge → `QA-002` (archive original) |
| 03_Fix_claims_service.md | Prompt | Historical original | Merge → `QA-002` (archive original) |
| 04_investigate_remaining_test_failure.md | Prompt | Historical original | Merge → `QA-002` (archive original) |
| 05_fix_failures.md | Prompt | Historical original | Merge → `QA-002` (archive original) |
| 06_Clain_Final_Fix (no extension) | Prompt | Historical original, Incomplete (missing `.md`) | Archive original; content folded into `QA-002` |
| 07_Playwright_Setup.md | Prompt | Historical original | Merge → `QA-005` (archive original) |
| Fix_Playwright_Script.md | Prompt | Historical original | Merge → `QA-005` (archive original) |

New prompt library (created in Phase 4): `prompts/README.md` (registry),
`prompts/PROJECT_CONTEXT.md`, `prompts/COPILOT_WORKING_GUIDELINES.md`, and
`QA-001…QA-008` category files. Originals moved to `prompts/archive/`.

## G. Raw test evidence — KEEP IN PLACE (do not move/delete)

| Location | Content |
| --- | --- |
| `code/claims-service/*-output.txt` | Claims unit/integration/pact-provider Maven output |
| `code/bff-service/*-output.txt` | BFF all-tests / pact-consumer Maven output |
| `code/demo-app-ui/e2e-full-run{1,2,3}.txt`, `vitest-output.txt`, `tsc-output.txt`, `build-output.txt` | Frontend/E2E output |
| `code/*/target/surefire-reports/` | JUnit XML (authoritative counts) |
| `code/bff-service/pacts/…json`, `code/claims-service/src/test/resources/pacts/…json` | Pact contracts |
| `performance/k6/results/*.json` | k6 summary exports |
| `test-results/`, `code/demo-app-ui/playwright-report/` | Playwright artefacts |

## Key findings

- **Source of truth:** `docs/FINAL_QA_ASSESSMENT_REPORT.md` (assessment) +
  `docs/FINAL_ASSESSMENT_EVIDENCE_AUDIT.md` (verification) +
  `docs/PROJECT_CONTEXT.md` (onboarding). Canonical test docs: STRATEGY / SCENARIOS /
  EXECUTION_REPORT.
- **Duplicate/overlapping content:** many SESSION_* and PLAYWRIGHT_* files describe the same
  journey at different points in time; consolidated into the canonical set and archived.
- **Contradictory / outdated test counts:** historical docs cite BFF 217, Vitest 266, 19/16
  E2E. Current verified counts: Claims unit **197**, BFF **228** (207 unit + 7 Pact consumer +
  14 integration), Claims integration **8**, Pact **7 consumer / 7 provider**, Vitest **268**,
  E2E **24** (×3). Canonical docs carry the current numbers; historical ones are labelled.
- **Missing implementation docs (now added):** dedicated HOW guides for Testcontainers, Pact,
  Playwright, k6, CI/CD (Phase 3).
- **Incomplete prompts:** `06_Clain_Final_Fix` has no file extension; original prompt wording
  for the Part-2 layers lived only in conversation history (reconstructed in the library and
  labelled).
