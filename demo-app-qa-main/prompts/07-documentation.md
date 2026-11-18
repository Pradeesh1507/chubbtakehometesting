# QA-007 — Documentation & Knowledge Management

- **Prompt ID:** QA-007
- **Name:** Test strategy, manual scripts & documentation consolidation
- **Version:** 1.0
- **Status:** ACTIVE. **ACTUAL** — this is the prompt family actually used for the strategy /
  manual scripts and the documentation-consolidation task in this project.
- **Execution status:** Executed — `TEST_STRATEGY.md`, `TEST_SCENARIOS.md`, implementation
  guides, inventory, and this prompt library produced.

## Objective
Produce the test strategy and manual scripts, and keep one maintainable, traceable knowledge
base (canonical docs + prompt library) with no information loss.

## Context & prerequisites
- Read `docs/PROJECT_CONTEXT.md` and `docs/DOCUMENTATION_INVENTORY.md`.
- Canonical docs live in `docs/`; implementation guides in `docs/implementation/`; history in
  `docs/archive/`.

## Reusable prompt text
```
Act as a Senior QA Documentation Architect.

1. TEST_STRATEGY.md — all levels (unit/integration/contract/E2E/performance/manual), test
   environment, test data, entry/exit criteria, defect management, risks, metrics; explain why
   each level exists and the defects it catches; include run commands.
2. TEST_SCENARIOS.md — execution-ready MANUAL cases with columns: Test Case ID, Module, Scenario,
   Preconditions, Test Data, Steps, Expected Result, Actual Result, Status, Priority. Cover
   positive/negative/boundary/authorization. Keep Status "Not Executed" unless actually executed.
3. Consolidate documentation: inventory everything; define canonical source-of-truth docs; add
   HOW implementation guides (distinct from strategy); archive historical/superseded reports;
   keep raw evidence; fix internal links; avoid duplicates.

Rules: do not lose information; do not present historical results as current; do not invent
prompt history; do not claim manual execution that never happened.
```

## Execution steps
1. Inventory `docs/` + `prompts/` (DOCUMENTATION_INVENTORY.md).
2. Create/refresh canonical docs + implementation guides + prompt library.
3. Archive historical docs/prompts; update links; write the consolidation report.

## Verification
- Links resolve; counts match latest evidence; historical clearly labelled; manual cases Not
  Executed.

## Related files
- `docs/TEST_STRATEGY.md`, `docs/TEST_SCENARIOS.md`, `docs/implementation/**`,
  `docs/DOCUMENTATION_INVENTORY.md`, `docs/DOCUMENTATION_CONSOLIDATION_REPORT.md`
