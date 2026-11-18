# QA-008 — Final Verification & Evidence Audit

- **Prompt ID:** QA-008
- **Name:** Final QA verification & evidence audit
- **Version:** 1.0
- **Status:** ACTIVE. **ACTUAL** — this is the evidence-audit prompt actually used in this
  project.
- **Execution status:** Executed — see `docs/FINAL_ASSESSMENT_EVIDENCE_AUDIT.md`.

## Objective
Independently verify every assessment claim against real execution output; separate verified
results, reported results and limitations. No code/test changes.

## Context & prerequisites
- Read `docs/PROJECT_CONTEXT.md`, `docs/TEST_EXECUTION_REPORT.md`,
  `docs/FINAL_QA_ASSESSMENT_REPORT.md`.
- Evidence locations in `docs/evidence/README.md`.

## Reusable prompt text
```
Perform a final, read-only evidence audit. Do not modify application code or tests. Verify:
1. Exact backend test-count breakdown (from surefire XML); confirm no double counting.
2. Testcontainers integration classes actually start real containers (from logs).
3. Pact JSON exists and provider verification consumes the generated contract.
4. k6 scripts + JSON results: VUs, duration, iterations, req/s, p50/p90/p95, error rate,
   thresholds.
5. TEST_STRATEGY.md covers all required levels; TEST_SCENARIOS.md is execution-ready.
6. CI/CD: which stages are actually validated vs not executed.
7. Playwright: tests discovered, executed, passing, zero skipped.
8. Git status; list every changed/new file (if not a git repo, say so and derive the list).

Produce docs/FINAL_ASSESSMENT_EVIDENCE_AUDIT.md separating VERIFIED / REPORTED / LIMITATIONS.
Never claim a test passed without actual execution output.
```

## Execution steps
1. Parse surefire XML; read k6 JSON; grep execution logs for container/pact/e2e evidence.
2. `npx playwright test --list`; confirm discovery + zero skip annotations.
3. Validate CI YAML; check git status; compile the change list.

## Verification
- Every claim is backed by a cited artefact; unverifiable items labelled as limitations.

## Related files
- `docs/FINAL_ASSESSMENT_EVIDENCE_AUDIT.md`, `docs/evidence/README.md`,
  `code/*/target/surefire-reports/`, `performance/k6/results/*.json`
