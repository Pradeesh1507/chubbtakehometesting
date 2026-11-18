import { PROFILES, CLAIMANT, ADMIN } from './config/environment.js';
import { authenticate } from './lib/auth.js';
import { mixedWorkloadScenario } from './scenarios/workflows.js';

/**
 * LOAD TEST — simulates a realistic, steady normal workload.
 *
 * Assumptions (documented):
 *  - ~10 concurrent active users during steady state.
 *  - Users are already authenticated (sessions established once in setup()); this
 *    models sustained usage and isolates the measurement to the claims/admin APIs
 *    rather than the login / identity provider.
 *  - Read-heavy mix: ~1 in 5 users are admins; claimants do 65% list / 35% submit.
 *  - 1s think-time between user actions.
 *
 * Thresholds (proposed acceptance criteria, not SLAs):
 *  - < 1% request failure rate
 *  - p95 < 800ms, p99 < 1500ms
 *  - > 99% functional checks pass
 */
export const options = {
  ...PROFILES.load,
  summaryTrendStats: ['avg', 'min', 'med', 'p(50)', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const claimantCookie = authenticate(CLAIMANT);
  const adminCookie = authenticate(ADMIN);
  if (!claimantCookie || !adminCookie) {
    throw new Error('Load test setup failed: could not authenticate seed users');
  }
  return { claimantCookie, adminCookie };
}

export default function (session) {
  mixedWorkloadScenario(session);
}

