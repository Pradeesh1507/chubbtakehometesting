import { test, expect } from '../fixtures/auth.fixture';
import { SignupPage } from '../pages/index';

/**
 * Additional end-to-end user journeys that complement the auth/claims/admin specs:
 * logout + route protection, duplicate signup rejection, claim persistence across
 * reloads, viewing claim details, and role-based access restrictions.
 */

async function submitAClaim(page: import('@playwright/test').Page) {
  await page.goto('/claims/new');
  await page.waitForSelector('[data-testid="wizard-step-1"]', { timeout: 15000 });

  const today = new Date().toISOString().split('T')[0];
  await page.fill('input[id="incidentDate"]', today);
  await page.fill('input[id="incidentLocation"]', '742 Evergreen Terrace, Springfield');
  await page.fill('input[type="number"][id="claimAmount"]', '4200');
  await page.click('[data-testid="wizard-step-1"] button[type="submit"]');
  await page.waitForTimeout(400);

  await page.fill(
    'textarea[id="description"]',
    'Detailed incident description that satisfies the minimum length requirement.'
  );
  await page.click('[data-testid="wizard-step-2"] button[type="submit"]');
  await page.waitForTimeout(400);

  await page.click('[data-testid="wizard-step-3"] button:has-text("Submit Claim")');
  await page.waitForURL('**/claims', { timeout: 15000 });
}

test.describe('Additional User Journeys', () => {
  test('should log the user out and protect routes afterwards', async ({ page, auth }) => {
    await auth.createAndLoginUser();
    try {
      await page.waitForURL('**/claims', { timeout: 15000 });
    } catch {
      await page.goto('/claims');
    }

    // Log out from the header
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');

    // Protected routes now redirect unauthenticated users back to login
    await page.goto('/claims');
    await page.waitForURL('**/login**', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('should reject a duplicate signup with an existing email', async ({ page, auth }) => {
    const user = auth.getTestUser();
    const signupPage = new SignupPage(page);

    // First signup succeeds and redirects to login
    await signupPage.goto();
    await signupPage.signup(user.name, user.email, user.password);
    await page.waitForURL('**/login', { timeout: 15000 });

    // Second signup with the same email must be rejected
    await signupPage.goto();
    await signupPage.signup('Different Name', user.email, user.password);

    const emailError = page.locator('p#email-error[role="alert"]');
    await emailError.waitFor({ state: 'visible', timeout: 10000 });
    expect(await emailError.textContent()).toContain('already exists');
    expect(page.url()).toContain('/signup');
  });

  test('should persist a submitted claim after a page reload', async ({ page, auth }) => {
    await auth.createAndLoginUser();
    try {
      await page.waitForURL('**/claims', { timeout: 15000 });
    } catch {
      await page.goto('/claims');
    }

    await submitAClaim(page);

    await page.waitForSelector('[data-testid="view-details-button"]', { timeout: 15000 });
    const countBefore = await page.locator('[data-testid="view-details-button"]').count();
    expect(countBefore).toBeGreaterThan(0);

    await page.reload();
    await page.waitForSelector('[data-testid="view-details-button"]', { timeout: 15000 });
    const countAfter = await page.locator('[data-testid="view-details-button"]').count();
    expect(countAfter).toBe(countBefore);
  });

  test('should let a claimant open claim details', async ({ page, auth }) => {
    await auth.createAndLoginUser();
    try {
      await page.waitForURL('**/claims', { timeout: 15000 });
    } catch {
      await page.goto('/claims');
    }

    await submitAClaim(page);

    await page.waitForSelector('[data-testid="view-details-button"]', { timeout: 15000 });
    await page.locator('[data-testid="view-details-button"]').first().click();

    const modal = page.locator('[data-testid="claim-detail-modal"]');
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    expect(await modal.isVisible()).toBeTruthy();
  });

  test('should redirect a claimant away from the admin dashboard', async ({ page, auth }) => {
    await auth.createAndLoginUser();
    try {
      await page.waitForURL('**/claims', { timeout: 15000 });
    } catch {
      await page.goto('/claims');
    }

    // A claimant lacks the ADMIN role: the dashboard stats API returns 403 and
    // the page redirects back to the claims list.
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/claims', { timeout: 15000 });
    expect(page.url()).toContain('/claims');
  });
});
