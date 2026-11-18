/**
 * Shared environment / configuration for the k6 performance suite.
 *
 * All values are overridable via environment variables so the same scripts run
 * unchanged against local, CI or a deployed environment, e.g.:
 *
 *   k6 run -e BASE_URL=http://localhost:8090 performance/k6/smoke-test.js
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

export const CLAIMANT = {
  email: __ENV.CLAIMANT_EMAIL || 'claimant@demo.com',
  password: __ENV.CLAIMANT_PASSWORD || 'Claimant123!',
};

export const ADMIN = {
  email: __ENV.ADMIN_EMAIL || 'admin@demo.com',
  password: __ENV.ADMIN_PASSWORD || 'Admin123!',
};

export const ENDPOINTS = {
  login: '/api/auth/login',
  signup: '/api/auth/signup',
  claims: '/api/claims',
  adminStats: '/api/admin/dashboard/stats',
  adminClaims: '/api/admin/claims',
};

/**
 * Proposed acceptance thresholds (NOT established SLAs).
 * Starting points to be calibrated against representative hardware.
 */
export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'],          // < 1% transport-level failures
  http_req_duration: ['p(95)<800', 'p(99)<1500'],
  checks: ['rate>0.99'],                    // > 99% functional checks pass
};

export const PROFILES = {
  smoke: {
    vus: 1,
    duration: '30s',
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<1500'],
      checks: ['rate>0.99'],
    },
  },
  load: {
    stages: [
      { duration: '30s', target: 10 }, // ramp-up to 10 virtual users
      { duration: '1m', target: 10 },  // steady state
      { duration: '20s', target: 0 },  // ramp-down
    ],
    thresholds: THRESHOLDS,
  },
  stress: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '1m', target: 40 },
      { duration: '1m', target: 60 }, // safe configured ceiling
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.10'],
      http_req_duration: ['p(95)<3000'],
    },
  },
};
