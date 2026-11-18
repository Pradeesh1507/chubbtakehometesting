import { PROFILES, CLAIMANT, ADMIN } from './config/environment.js';
import { authenticate } from './lib/auth.js';
import { mixedWorkloadScenario } from './scenarios/workflows.js';

/**
 * STRESS TEST — gradually increases concurrency to a safe configured ceiling to
 * identify degradation and failure behaviour. Stops at 60 VUs by default; raise
 * only against an environment you are willing to saturate.
 *
 * Sessions are established once in setup() so the test characterises the claims/
 * admin API under pressure rather than the identity provider.
 *
 * WARNING: Do not run against shared or production-like environments without
 * explicit approval.
 */
export const options = {
  ...PROFILES.stress,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const claimantCookie = authenticate(CLAIMANT);
  const adminCookie = authenticate(ADMIN);
  if (!claimantCookie || !adminCookie) {
    throw new Error('Stress test setup failed: could not authenticate seed users');
  }
  return { claimantCookie, adminCookie };
}

export default function (session) {
  mixedWorkloadScenario(session);
}

