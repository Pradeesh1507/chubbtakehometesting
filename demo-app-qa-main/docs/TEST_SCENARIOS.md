# Manual Test Scenarios — demo-app-qa

Execution-ready manual test scripts for the `demo-app-qa` claims-management platform. Each case is written so any tester can run it without prior context: it states preconditions, the exact data to use, numbered steps, and the expected result.

These scripts were **not executed** in this session. Every case therefore has an empty **Actual Result** and a **Status** of **Not Executed** — testers fill these in during a real run.

---

## Environment Under Test

| Component | URL / Port |
|-----------|-----------|
| UI (Next.js prod) | http://localhost:3101 |
| BFF | http://localhost:8090 |
| Claims Service | http://localhost:8080 |
| Keycloak (realm `demo-app`) | http://localhost:8180 |

### Seeded accounts

| Email | Password | Role |
|-------|----------|------|
| `claimant@demo.com` | `Claimant123!` | CLAIMANT |
| `admin@demo.com` | `Admin123!` | ADMIN |

---

## Legend

| Field | Meaning |
|-------|---------|
| **Test Case ID** | Unique identifier, `TC-<MODULE>-<NNN>` |
| **Module** | Functional area under test |
| **Priority** | Critical / High / Medium / Low — business impact & likelihood |
| **Status** | Not Executed / Pass / Fail / Blocked (default: **Not Executed**) |
| **Actual Result** | Observed outcome, filled during execution (blank until run) |

**Module codes:** AUTH (registration & authentication), CLAIM (claims creation), LIST (claims listing & details), ADMIN (admin dashboard), AUTHZ (authorization / roles), API (API error handling).

---

## 1. Registration & Authentication (AUTH)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | AUTH | Sign up with valid details | App running; email not already registered | Email `newuser1@demo.com`, Password `NewUser123!` | 1. Open http://localhost:3101. 2. Go to Sign up. 3. Enter email & password. 4. Submit. | Account created (`POST /api/auth/signup` → success); user is logged in or redirected to login with success message | | Not Executed | Critical |
| TC-AUTH-002 | AUTH | Duplicate signup rejected | `claimant@demo.com` already exists | Email `claimant@demo.com`, Password `Claimant123!` | 1. Open Sign up. 2. Enter existing email & a valid password. 3. Submit. | Signup rejected with a clear "email already in use" style error; no duplicate account created | | Not Executed | High |
| TC-AUTH-003 | AUTH | Weak password rejected | App running | Email `weakpw@demo.com`, Password `123` | 1. Open Sign up. 2. Enter email and weak password. 3. Submit. | Validation error shown; account not created | | Not Executed | High |
| TC-AUTH-004 | AUTH | Invalid email format rejected | App running | Email `not-an-email`, Password `Valid123!` | 1. Open Sign up. 2. Enter malformed email. 3. Submit. | Inline validation error; submission blocked | | Not Executed | Medium |
| TC-AUTH-005 | AUTH | Login with valid credentials | Seeded claimant exists | `claimant@demo.com` / `Claimant123!` | 1. Open Login. 2. Enter credentials. 3. Submit. | Login succeeds; auth cookies set; redirected to claims dashboard | | Not Executed | Critical |
| TC-AUTH-006 | AUTH | Login with invalid credentials | App running | `claimant@demo.com` / `WrongPass!` | 1. Open Login. 2. Enter wrong password. 3. Submit. | Login fails with generic error; no session created | | Not Executed | High |
| TC-AUTH-007 | AUTH | Logout clears session | Logged in as claimant | — | 1. Log in. 2. Click Logout. 3. Attempt to open a protected page. | Session cleared; protected page redirects to login | | Not Executed | High |
| TC-AUTH-008 | AUTH | Session expiry handling | Logged in; token expirable | — | 1. Log in. 2. Wait for / force access token expiry. 3. Trigger an action calling the BFF. | App refreshes token (`/api/auth/refresh`) or redirects to login; no silent 401 shown as a crash | | Not Executed | Medium |
| TC-AUTH-009 | AUTH | Login retry after brute-force lock | Keycloak brute-force active | `admin@demo.com` / `Admin123!` | 1. Trigger repeated concurrent logins of same account. 2. Observe temporary rejection. 3. Retry after short wait. | Concurrent "quick login" may be rejected; retry succeeds — matches known Keycloak behaviour | | Not Executed | Medium |

---

## 2. Claims Creation (CLAIM)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-CLAIM-001 | CLAIM | Submit valid claim via wizard | Logged in as claimant | Valid title, amount `500.00`, valid description | 1. Open New Claim wizard. 2. Complete each step with valid data. 3. Review & submit. | Claim created (`POST /api/claims` → 201); confirmation shown; claim appears in list | | Not Executed | Critical |
| TC-CLAIM-002 | CLAIM | Required-field validation | Logged in as claimant | Leave required fields empty | 1. Open wizard. 2. Leave a required field blank. 3. Try to advance / submit. | Advancement blocked; inline validation error on the empty field | | Not Executed | High |
| TC-CLAIM-003 | CLAIM | Amount boundary — minimum | Logged in as claimant | Amount at the minimum allowed value | 1. Open wizard. 2. Enter minimum valid amount. 3. Submit. | Claim accepted at the minimum boundary | | Not Executed | Medium |
| TC-CLAIM-004 | CLAIM | Amount boundary — maximum | Logged in as claimant | Amount at the maximum allowed value | 1. Open wizard. 2. Enter maximum valid amount. 3. Submit. | Claim accepted at the maximum boundary | | Not Executed | Medium |
| TC-CLAIM-005 | CLAIM | Amount below minimum rejected | Logged in as claimant | Amount below minimum (e.g. `0` or negative) | 1. Open wizard. 2. Enter sub-minimum amount. 3. Submit. | Validation error; claim not created | | Not Executed | High |
| TC-CLAIM-006 | CLAIM | Amount above maximum rejected | Logged in as claimant | Amount above the maximum allowed | 1. Open wizard. 2. Enter over-maximum amount. 3. Submit. | Validation error; claim not created | | Not Executed | High |
| TC-CLAIM-007 | CLAIM | Description minimum length boundary | Logged in as claimant | Description at minimum allowed length | 1. Open wizard. 2. Enter shortest valid description. 3. Submit. | Claim accepted at minimum length boundary | | Not Executed | Low |
| TC-CLAIM-008 | CLAIM | Description maximum length boundary | Logged in as claimant | Description at maximum allowed length | 1. Open wizard. 2. Enter longest valid description. 3. Submit. | Claim accepted at maximum length boundary | | Not Executed | Low |
| TC-CLAIM-009 | CLAIM | Description over maximum rejected | Logged in as claimant | Description exceeding max length | 1. Open wizard. 2. Enter over-length description. 3. Submit. | Validation error; claim not created | | Not Executed | Medium |
| TC-CLAIM-010 | CLAIM | Cancel wizard without entered data | Logged in as claimant | No data entered | 1. Open wizard. 2. Immediately click Cancel. | Wizard closes directly with no discard-confirmation prompt | | Not Executed | Medium |
| TC-CLAIM-011 | CLAIM | Cancel wizard with typed, unsubmitted data | Logged in as claimant | Partially typed (not submitted) data | 1. Open wizard. 2. Type into a field but do not submit. 3. Click Cancel. | Discard-confirmation dialog appears because typed-but-unsubmitted data is detected (regression guard for fixed defect) | | Not Executed | High |
| TC-CLAIM-012 | CLAIM | Confirm discard discards data | Logged in as claimant; wizard has typed data | — | 1. Type data. 2. Click Cancel. 3. Confirm discard in dialog. | Wizard closes; data discarded; no claim created | | Not Executed | Medium |
| TC-CLAIM-013 | CLAIM | Dismiss discard keeps editing | Logged in as claimant; wizard has typed data | — | 1. Type data. 2. Click Cancel. 3. Dismiss the discard dialog. | Dialog closes; wizard still open with entered data intact | | Not Executed | Medium |

---

## 3. Claims Listing & Details (LIST)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-001 | LIST | Empty state for new claimant | Fresh account with no claims | New registered user | 1. Log in as a user with no claims. 2. Open claims list. | Friendly empty state shown; no errors | | Not Executed | Medium |
| TC-LIST-002 | LIST | List populates after submit | Logged in as claimant | One submitted claim | 1. Submit a valid claim (TC-CLAIM-001). 2. Open claims list. | The new claim appears with correct title/amount/status | | Not Executed | Critical |
| TC-LIST-003 | LIST | View claim details | Logged in; at least one claim exists | Existing claim id | 1. Open claims list. 2. Click a claim. | Detail view loads (`GET /api/claims/{id}` → 200) with correct field values | | Not Executed | High |
| TC-LIST-004 | LIST | Persistence after reload | Logged in; claim exists | — | 1. Submit/view a claim. 2. Reload the page (F5). | Claim list and details persist after reload; still authenticated | | Not Executed | High |

---

## 4. Admin Dashboard (ADMIN)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-ADMIN-001 | ADMIN | View dashboard statistics | Logged in as admin | `admin@demo.com` / `Admin123!` | 1. Log in as admin. 2. Open the admin dashboard. | Stats load (`GET /api/admin/dashboard/stats`); values render with the stat `data-testid` present | | Not Executed | High |
| TC-ADMIN-002 | ADMIN | Admin claims management list | Logged in as admin; claims exist | — | 1. Open admin claims management. | All claims across users are listed (`GET /api/admin/claims`) | | Not Executed | High |
| TC-ADMIN-003 | ADMIN | Update claim status | Logged in as admin; a claim exists | Target status value | 1. Open admin claims. 2. Open a claim. 3. Change its status. 4. Save. | Status updated and reflected in the list; dashboard stats update accordingly | | Not Executed | High |
| TC-ADMIN-004 | ADMIN | Stats reflect new claim | Admin & claimant accounts | One new claim | 1. Note current counts. 2. Claimant submits a new claim. 3. Reload admin dashboard. | Relevant stat count increases (cache refresh/invalidation works) | | Not Executed | Medium |

---

## 5. Authorization / Role Restrictions (AUTHZ)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTHZ-001 | AUTHZ | Claimant cannot access admin area | Logged in as claimant | `claimant@demo.com` | 1. Log in as claimant. 2. Navigate directly to an admin URL. | Access denied / redirected away; no admin data exposed (403 at API) | | Not Executed | Critical |
| TC-AUTHZ-002 | AUTHZ | Admin can access admin area | Logged in as admin | `admin@demo.com` | 1. Log in as admin. 2. Open admin dashboard & claims. | Full admin access granted | | Not Executed | High |
| TC-AUTHZ-003 | AUTHZ | Unauthenticated redirect | Logged out | — | 1. Ensure logged out. 2. Open a protected URL directly. | Redirected to login; protected content never rendered | | Not Executed | Critical |
| TC-AUTHZ-004 | AUTHZ | Claimant sees only own claims | Two claimants each with claims | Two claimant accounts | 1. Log in as claimant A. 2. View claims list. 3. Attempt to open claimant B's claim id directly. | Only own claims visible; other user's claim returns 403 (`GET /api/claims/{id}` → 403) | | Not Executed | High |

---

## 6. API Error Handling (API)

| Test Case ID | Module | Scenario | Preconditions | Test Data | Steps | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|---|
| TC-API-001 | API | 401 on missing/invalid auth | API reachable | No/invalid cookie | 1. Call `GET /api/claims` without valid auth cookie. | Response `401 Unauthorized`; no data leaked. (Regression guard: proxy must not forward an empty `Authorization` header) | | Not Executed | High |
| TC-API-002 | API | 403 on forbidden resource | Logged in as claimant | Another user's claim id | 1. As claimant, call `GET /api/claims/{otherUserClaimId}`. | Response `403 Forbidden` | | Not Executed | High |
| TC-API-003 | API | 404 on missing resource | Logged in as claimant | Non-existent claim id | 1. Call `GET /api/claims/{nonexistentId}`. | Response `404 Not Found` with error body | | Not Executed | Medium |
| TC-API-004 | API | 400 on invalid create payload | Logged in as claimant | Invalid/empty claim payload | 1. `POST /api/claims` with an invalid body. | Response `400 Bad Request` with validation details; no claim created | | Not Executed | High |
| TC-API-005 | API | 409 on duplicate user | Internal user endpoint reachable | Existing user payload | 1. `POST /api/users` with a user that already exists. | Response `409 Conflict` | | Not Executed | Medium |
| TC-API-006 | API | 201 on valid claim create | Logged in as claimant | Valid claim payload | 1. `POST /api/claims` with valid body. | Response `201 Created`; `Location`/claim id returned | | Not Executed | High |
| TC-API-007 | API | 200 on list claims | Logged in as claimant | — | 1. `GET /api/claims`. | Response `200 OK` with the caller's claims array | | Not Executed | Medium |

---

### Summary

- **Total cases:** 38
- **Modules covered:** AUTH (9), CLAIM (13), LIST (4), ADMIN (4), AUTHZ (4), API (7)
- **Coverage types:** positive, negative, boundary, and authorization cases across all modules.
- **Execution status:** all **Not Executed** (manual scripts, not run this session).
