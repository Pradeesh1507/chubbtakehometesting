# Implementation Guide — CI/CD Testing Integration

How the continuous-integration pipeline is structured. For *what/why* see
[../TEST_STRATEGY.md](../TEST_STRATEGY.md).

## Purpose
Run every test layer automatically on push / pull request, publish artefacts, and keep
performance stress testing out of the deployment gate.

## File
`.github/workflows/ci.yml` — GitHub Actions. **Status: YAML-validated and command-parity
verified locally; not executed on a CI runner in this environment** (the repo is not a Git repo
here and no runner is available).

## Jobs (8)
| Job | Depends on | What it runs |
| --- | --- | --- |
| `backend-unit` | — | `mvn test` for claims-service + bff-service (matrix) |
| `frontend-unit` | — | `npm ci`, `npm run test`, `npx tsc --noEmit`, `npm run build` |
| `integration-tests` | backend-unit | `mvn test -Dsurefire.excludedGroups= -Dgroups=integration` (matrix, Docker) |
| `pact-consumer` | backend-unit | generate pact; upload `pacts/` artefact |
| `pact-provider` | pact-consumer | download pact; verify against provider |
| `e2e` | frontend-unit, backend-unit | compose up infra+apps, build+start UI on 3101, `npx playwright test` |
| `k6-smoke` | e2e | install k6, run smoke profile, upload summary |
| `k6-stress` | k6-smoke | **manual, non-gating** (`workflow_dispatch` + `run_stress`, `continue-on-error`) |

## Important configuration
- Triggers: `push` (main/master), `pull_request`, `workflow_dispatch` (with `run_stress` input).
- Java 21 (temurin) + Node 22, with Maven/npm caching.
- Integration / Pact-provider / E2E / k6 jobs rely on Docker, available on `ubuntu-latest`.
- Pact is passed between jobs via `upload-artifact` / `download-artifact`.
- Artefacts retained: surefire reports, pact JSON, Playwright report, k6 summary.
- The test JVM UTC pinning lives in the poms, so CI inherits deterministic timezone behaviour.

## Validate locally
```powershell
# YAML syntax (8 jobs expected)
python -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(list(d['jobs']))"
```
Each job's underlying command has been executed locally — see
[../TEST_EXECUTION_REPORT.md](../TEST_EXECUTION_REPORT.md) for the proven results.

## Expected results (when run on CI)
All gating jobs green; `k6-stress` informational only. Artefacts downloadable from the run.

## Troubleshooting
- **Docker-dependent jobs fail to find Docker** → use a runner image with Docker (ubuntu-latest).
- **E2E flakiness on shared admin account** → the fixture retry handles Keycloak quick-login;
  keep `workers` modest if needed.
- **Pact provider can't find the contract** → ensure the `pacts` artefact is downloaded into
  `code/claims-service/src/test/resources/pacts/` before the provider job.
- **Timezone-related failures** → confirm the surefire `argLine` UTC pin is present in both poms.
