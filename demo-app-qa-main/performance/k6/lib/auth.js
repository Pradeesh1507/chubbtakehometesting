import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, ENDPOINTS } from '../config/environment.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Logs in via the BFF. The BFF sets httpOnly access_token / refresh_token cookies,
 * which k6's per-VU cookie jar automatically replays on subsequent requests.
 *
 * @returns {boolean} true when authentication succeeded.
 */
export function login(credentials) {
  const res = http.post(
    `${BASE_URL}${ENDPOINTS.login}`,
    JSON.stringify({ email: credentials.email, password: credentials.password }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/auth/login' } }
  );

  return check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns a user id': (r) => {
      try {
        return typeof r.json('userId') === 'string';
      } catch (e) {
        return false;
      }
    },
  });
}

/** Builds a valid, unique claim submission payload. */
export function buildClaimPayload() {
  const daysAgo = 1 + Math.floor(Math.random() * 300);
  const incidentDate = new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .split('T')[0];

  return {
    incidentDate,
    incidentLocation: `${100 + Math.floor(Math.random() * 9000)} Performance Ave, Load City`,
    description: `Performance test claim generated at ${new Date().toISOString()} with sufficient detail.`,
    claimAmount: Number((500 + Math.random() * 20000).toFixed(2)),
  };
}

// Authenticates once and returns a ready-to-send `Cookie` header value containing
// the access_token. Intended for k6 setup() so a load/stress run authenticates a
// small fixed number of times and all VUs reuse the session — modelling
// already-authenticated users and avoiding Keycloak brute-force throttling of a
// shared account under concurrency.
export function authenticate(credentials) {
  const res = http.post(
    `${BASE_URL}${ENDPOINTS.login}`,
    JSON.stringify({ email: credentials.email, password: credentials.password }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/auth/login (setup)' } }
  );
  if (res.status !== 200) {
    return null;
  }
  const cookie = res.cookies && res.cookies['access_token'];
  if (!cookie || cookie.length === 0) {
    return null;
  }
  return `access_token=${cookie[0].value}`;
}

export { JSON_HEADERS };

