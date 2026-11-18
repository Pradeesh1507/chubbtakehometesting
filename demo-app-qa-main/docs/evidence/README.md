# Evidence Index

Raw execution evidence is **kept in place** (not moved) so links in reports stay valid and logs
remain next to the code that produced them. This index maps each layer to its evidence.

> All results below were produced by actual execution on 2026-11-17. See
> [../TEST_EXECUTION_REPORT.md](../TEST_EXECUTION_REPORT.md) and
> [../FINAL_ASSESSMENT_EVIDENCE_AUDIT.md](../FINAL_ASSESSMENT_EVIDENCE_AUDIT.md).

## Backend
| Evidence | Location |
| --- | --- |
| Claims unit (197) | `code/claims-service/claims-unit-output.txt` |
| Claims integration (8, Testcontainers) | `code/claims-service/claims-integration-output.txt` |
| Claims Pact provider (7 verified) | `code/claims-service/pact-provider-output.txt` |
| BFF all (228: unit+consumer+integration) | `code/bff-service/bff-all-tests-output.txt` |
| BFF Pact consumer (7) | `code/bff-service/pact-consumer-output.txt` |
| JUnit XML (authoritative counts) | `code/claims-service/target/surefire-reports/`, `code/bff-service/target/surefire-reports/` |

## Frontend
| Evidence | Location |
| --- | --- |
| Vitest (268) | `code/demo-app-ui/vitest-output.txt` |
| TypeScript (0 errors) | `code/demo-app-ui/tsc-output.txt` |
| Production build | `code/demo-app-ui/build-output.txt` |

## E2E (Playwright)
| Evidence | Location |
| --- | --- |
| 3 consecutive full runs (24/24) | `code/demo-app-ui/e2e-full-run1.txt`, `e2e-full-run2.txt`, `e2e-full-run3.txt` |
| HTML/JUnit report | `code/demo-app-ui/playwright-report/` |
| Trace/context artefacts | `test-results/`, `code/demo-app-ui/test-results/` |

## Contracts (Pact)
| Evidence | Location |
| --- | --- |
| Generated contract | `code/bff-service/pacts/bff-service-claims-service.json` |
| Provider copy (on classpath) | `code/claims-service/src/test/resources/pacts/bff-service-claims-service.json` |

## Performance (k6)
| Evidence | Location |
| --- | --- |
| Smoke summary | `performance/k6/results/smoke-summary.json` |
| Load summary | `performance/k6/results/load-summary.json` |
| Stress summary | `performance/k6/results/stress-summary.json` |

> Do not delete these files — they are the primary evidence for the assessment claims.
