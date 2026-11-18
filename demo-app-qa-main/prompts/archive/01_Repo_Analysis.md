# Prompt 01 – Repository Analysis

Act as a Senior QA Automation Architect with experience in microservices testing.

Analyze the existing Insurance Claims Management application.

The application consists of:
- Next.js frontend
- Spring Boot BFF service
- Spring Boot Claims Service
- PostgreSQL
- Redis
- Kafka
- Keycloak
- Debezium CDC

Analyze the actual repository and identify:

1. Application architecture and responsibilities of each component.
2. Existing unit testing frameworks and test coverage.
3. Existing integration testing implementation using Testcontainers.
4. Pact contract testing configuration between BFF and Claims Service.
5. Existing Playwright E2E configuration and test coverage.
6. Existing performance testing implementation, if any.
7. Broken, incomplete or disabled tests.
8. Existing OpenAPI and AsyncAPI specifications.
9. Missing QA coverage based on the assessment requirements.

Provide the findings under these headings:

- Architecture Overview
- Existing Test Infrastructure
- Existing Test Coverage
- Identified Gaps
- Risks
- Recommended Implementation Plan

IMPORTANT:
- Analyze actual repository files.
- Do not modify any files.
- Do not generate implementation code.
- Do not assume a feature is implemented merely because its configuration exists.
- Clearly distinguish existing implementation from scaffolding and missing functionality.