import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, ENDPOINTS, CLAIMANT } from '../config/environment.js';
import { login, buildClaimPayload, JSON_HEADERS } from '../lib/auth.js';

function authHeaders(cookie, extra) {
  const headers = Object.assign({}, extra || {});
  if (cookie) {
    headers.Cookie = cookie;
  }
  return headers;
}

/**
 * Scenario: authentication flow (login) — measures the credential -> cookie
 * exchange latency and success. Used by the smoke test at 1 VU.
 */
export function authScenario() {
  group('auth: login', () => {
    login(CLAIMANT);
  });
  sleep(1);
}

/** Scenario: claims list retrieval for an authenticated claimant. */
export function listClaimsScenario(claimantCookie) {
  group('claims: list', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.claims}`, {
      headers: authHeaders(claimantCookie),
      tags: { name: 'GET /api/claims' },
    });
    check(res, {
      'list claims status is 200': (r) => r.status === 200,
      'list claims returns an array': (r) => {
        try {
          return Array.isArray(r.json());
        } catch (e) {
          return false;
        }
      },
    });
  });
  sleep(1);
}

/** Scenario: claim submission by an authenticated claimant. */
export function submitClaimScenario(claimantCookie) {
  group('claims: submit', () => {
    const res = http.post(
      `${BASE_URL}${ENDPOINTS.claims}`,
      JSON.stringify(buildClaimPayload()),
      { headers: authHeaders(claimantCookie, JSON_HEADERS), tags: { name: 'POST /api/claims' } }
    );
    check(res, {
      'submit claim status is 201': (r) => r.status === 201,
      'submit claim returns a claimId': (r) => {
        try {
          return typeof r.json('claimId') === 'string';
        } catch (e) {
          return false;
        }
      },
    });
  });
  sleep(1);
}

/** Scenario: admin dashboard statistics retrieval. */
export function adminDashboardScenario(adminCookie) {
  group('admin: dashboard stats', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.adminStats}`, {
      headers: authHeaders(adminCookie),
      tags: { name: 'GET /api/admin/dashboard/stats' },
    });
    check(res, {
      'dashboard stats status is 200': (r) => r.status === 200,
      'dashboard stats returns totals': (r) => {
        try {
          return typeof r.json('totalClaims') === 'number';
        } catch (e) {
          return false;
        }
      },
    });
  });
  sleep(1);
}

/**
 * Scenario: mixed, realistic workload driven by sessions established once in
 * setup(). Roughly 1 in 5 VUs act as an admin, the rest as claimants, with reads
 * weighted above writes.
 *
 * @param {{claimantCookie: string, adminCookie: string}} session
 */
export function mixedWorkloadScenario(session) {
  const isAdmin = __VU % 5 === 0;
  if (isAdmin) {
    adminDashboardScenario(session.adminCookie);
    return;
  }
  if (Math.random() < 0.65) {
    listClaimsScenario(session.claimantCookie);
  } else {
    submitClaimScenario(session.claimantCookie);
  }
}
