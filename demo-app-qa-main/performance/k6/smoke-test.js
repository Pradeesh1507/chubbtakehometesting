import { PROFILES, CLAIMANT, ADMIN } from './config/environment.js';
import { authenticate } from './lib/auth.js';
import {
  authScenario,
  listClaimsScenario,
  submitClaimScenario,
  adminDashboardScenario,
} from './scenarios/workflows.js';

/**
 * SMOKE TEST — very low concurrency, short duration.
 * Verifies the scripts, environment and happy-path endpoints are working before
 * running heavier load. Exercises every scenario once per iteration, including a
 * real login (authScenario) to confirm the auth endpoint.
 */
export const options = {
  ...PROFILES.smoke,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  return {
    claimantCookie: authenticate(CLAIMANT),
    adminCookie: authenticate(ADMIN),
  };
}

export default function (session) {
  authScenario();
  listClaimsScenario(session.claimantCookie);
  submitClaimScenario(session.claimantCookie);
  adminDashboardScenario(session.adminCookie);
}

