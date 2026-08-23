# E2E Test Infra: FileGuard Document Integrity Platform

## Test Philosophy
- Opaque-box, requirement-driven verification derived directly from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Interaction Testing + Real-World Workload Simulation.
- Standalone test execution: Tests can run against local Express server with mocked or live database.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) |
|---|---------|----------------------|:-----------------:|:-------------------:|:---------------------:|
| 1 | DB Reliability & Retry | ORIGINAL_REQUEST §R3 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 2 | Health Telemetry Endpoint | ORIGINAL_REQUEST §R3 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 3 | Firebase Token Auth Middleware | ORIGINAL_REQUEST §R2 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 4 | User & Profile Management | ORIGINAL_REQUEST §R2 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 5 | WebCrypto SHA-256 Hashing | ORIGINAL_REQUEST §R5 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 6 | Document Anchoring & Deduplication | ORIGINAL_REQUEST §R5 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 7 | Document Verification (File & Hash) | ORIGINAL_REQUEST §R5 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 8 | PDF Certificate & QR Generation | ORIGINAL_REQUEST §R5 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 9 | My Documents Paginated Listing | ORIGINAL_REQUEST §R5 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 10 | SEO Meta, robots.txt, sitemap.xml | ORIGINAL_REQUEST §R4 | ≥ 5 cases | ≥ 5 cases | ✓ |
| 11 | Design Standards & Anti-AI Compliance | ORIGINAL_REQUEST §R1 | ≥ 5 cases | ≥ 5 cases | ✓ |

## Test Architecture
- Test Runner: `node tests/e2e/test_runner.js`
- Test Files:
  - `tests/e2e/tier1_features.test.js`: Equivalence class tests for every core feature in isolation.
  - `tests/e2e/tier2_boundaries.test.js`: Extremes, empty buffers, invalid signatures, malformed tokens, cold start simulation.
  - `tests/e2e/tier3_combinations.test.js`: Pairwise flows (Auth + Anchor + Verify + PDF + QR link + Paginate).
  - `tests/e2e/tier4_scenarios.test.js`: End-to-end user workflows (e.g. enterprise issuer notarization, document tampering detection, multi-page document pagination).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Enterprise Legal Document Notarization | Auth, Issuer Profile, WebCrypto SHA-256, Anchoring, PDF Certificate, QR generation | High |
| 2 | Third-Party Tamper Detection | Hashing, Modified File Verification, Unknown Hash 404, Audit Count Immutability | Medium |
| 3 | High-Volume Multi-Document Lifecycle | Repeated Anchoring, Duplicate Detection, Paginated Listing, Filter by Date | High |
| 4 | Database Outage & Graceful Recovery | DB Disconnect 503, Reconnect Backoff, Subsequent Anchoring Success | High |
| 5 | Token Expiration & Unauthenticated Rejection | Expired Token, Missing Bearer Header, Public Endpoint Accessibility | Medium |

## Coverage Thresholds
- **Tier 1**: ≥ 55 test cases (5 per feature × 11 features)
- **Tier 2**: ≥ 55 test cases (boundary & error cases)
- **Tier 3**: ≥ 15 cross-feature interaction cases
- **Tier 4**: ≥ 5 full application scenario simulations
- **Target Total**: ≥ 130 automated test assertions
