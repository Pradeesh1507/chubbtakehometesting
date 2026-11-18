# Copilot Working Guidelines (demo-app-qa)

Mandatory protocol for every Copilot Agent session on this repository. These rules keep work
evidence-based, non-destructive and traceable.

## Mandatory rules
1. **Read `docs/PROJECT_CONTEXT.md` first** — ports, commands, decisions, limitations.
2. **Read the relevant prompt** from [README.md](README.md) (QA-001 … QA-008) before starting.
3. **Inspect state before changing** — check `git status` (note: this repo may not be a Git
   repo; if so, inspect files directly and say so).
4. **Understand existing implementation** before editing code — read the real files; don't guess
   selectors, routes, payloads, or behaviour.
5. **Preserve already-passing tests** — never weaken, skip, delete, or `.only` tests to go green.
6. **Execute tests after changes** — run the narrowest relevant command, then the broader suite.
7. **Record ACTUAL results** — counts and pass/fail come from real output, never assumed.
8. **Update `ai-journal.md`** — append a dated session entry (objective, changes, results).
9. **Update the relevant canonical doc** (strategy/execution/implementation guide) — not a new
   duplicate.
10. **Never claim completion without execution evidence** — cite the log/report/artefact.
11. **Avoid duplicate documentation** — extend canonical docs; archive superseded ones.
12. **Use incremental changes** — small, verifiable steps; prefer root-cause fixes over masking.

## Hard "do not" list
- Do not change application business behaviour, test assertions, or Docker/compose config for
  convenience or to force a pass.
- Do not present historical results as current.
- Do not invent prompt history or mark manual tests as executed when they were not.
- Do not delete source, test code, execution logs, pact JSON, k6 results, or architecture
  diagrams.

## Root-cause fixes are allowed and expected
When a test exposes a genuine application defect, fix the **root cause** in app code (as done for
the empty-Authorization proxy header, the logout CSRF header, the claim-cancel form sync, and
the integration-test UTC timezone) — do not mask it. Add a regression test and record evidence.

## Progress tracking for long tasks
Maintain a short progress block (in the response and/or `ai-journal.md`):

```
Completed:        <done items with evidence>
In progress:      <current item>
Pending:          <queued items>
Blocked:          <blockers + reason>
Last verified cmd: <exact command + result>
Next action:      <the single next step>
```

## Definition of done
- Target suites executed and green (or blockers clearly documented).
- Canonical docs + `ai-journal.md` updated.
- Every claim backed by actual execution evidence.
