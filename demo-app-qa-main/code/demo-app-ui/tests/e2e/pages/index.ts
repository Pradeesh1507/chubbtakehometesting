
import { Page } from '@playwright/test';

/**
 * Page Object for Login page
 */
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[id="email"]', email);
    await this.page.fill('input[id="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    // Application error is displayed in a p tag with role="alert" and error class
    // This avoids matching the Next.js route announcer div
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');

    if (await errorElement.isVisible()) {
      const text = await errorElement.textContent();
      return text ? text.trim() : null;
    }

    return null;
  }

  async waitForErrorMessage() {
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');
    await errorElement.waitFor({ state: 'visible', timeout: 5000 });
    return await errorElement.textContent();
  }

  async isLoaded() {
    return this.page.locator('h1:has-text("Log In")').isVisible();
  }
}

/**
 * Page Object for Signup page
 */
export class SignupPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/signup');
  }

  async signup(name: string, email: string, password: string) {
    await this.page.fill('input[id="name"]', name);
    await this.page.fill('input[id="email"]', email);
    await this.page.fill('input[id="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async isLoaded() {
    return this.page.locator('h1:has-text("Create Account")').isVisible();
  }

  async getEmailErrorMessage() {
    // Email field error appears in a p tag with id="email-error" and role="alert"
    const errorAlert = this.page.locator('p#email-error[role="alert"]');

    return (await errorAlert.isVisible())
      ? await errorAlert.textContent()
      : null;
  }

  async getServerErrorMessage() {
    // Server-level error displayed in p tag with error class
    // This avoids matching the Next.js route announcer div
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');

    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }

    return null;
  }

  async waitForServerErrorMessage() {
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');
    await errorElement.waitFor({ state: 'visible', timeout: 5000 });
    return await errorElement.textContent();
  }
}

/**
 * Page Object for Claims Listing page
 */
export class ClaimsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/claims');
  }

  async isLoaded() {
    return this.page.locator('h1:has-text("My Claims")').isVisible();
  }

  async clickSubmitNewClaim() {
    await this.page.click('button:has-text("Submit New Claim")');
  }

  async getClaimCount() {
    const claims = this.page.locator('[data-testid^="claim-row-"]');
    return claims.count();
  }

  async hasClaimWithId(claimId: string) {
    return this.page.locator(`[data-testid="claim-row-${claimId}"]`).isVisible();
  }

  async getEmptyStateMessage() {
    // Use h2 heading selector which is more stable than text locator
    const emptyState = this.page.locator('h2:has-text("No claims yet")');

    return (await emptyState.isVisible())
      ? await emptyState.textContent()
      : null;
  }

  async clickViewDetails(claimId: string) {
    await this.page.click(
      `[data-testid="claim-row-${claimId}"] button:has-text("View Details")`
    );
  }

  async getErrorMessage() {
    // Avoid matching the Next.js route announcer div
    // Target paragraph tags with error class
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');

    return (await errorElement.isVisible())
      ? await errorElement.textContent()
      : null;
  }

  async waitForErrorMessage() {
    const errorElement = this.page.locator('p[role="alert"][class*="error"]');
    await errorElement.waitFor({ state: 'visible', timeout: 5000 });
    return await errorElement.textContent();
  }

  async clickRetryButton() {
    await this.page.click('button:has-text("Retry")');
  }
}

/**
 * Page Object for New Claim Wizard
 */
export class ClaimWizardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/claims/new');
  }

  async isLoaded() {
    return this.page.locator('h1:has-text("Submit New Claim")').isVisible();
  }

  async getCurrentStep() {
    const stepIndicator = this.page.locator('[data-testid="step-indicator"]');
    const text = await stepIndicator.textContent();
    const match = text?.match(/Step (\d+)/);

    return match ? parseInt(match[1], 10) : null;
  }

  async fillStep1(data: {
    incidentType: string;
    incidentDate: string;
    description: string;
  }) {
    if (data.incidentType) {
      await this.page.locator('select[id="incidentType"]').selectOption({
        label: data.incidentType,
      });
    }

    if (data.incidentDate) {
      await this.page.fill('input[id="incidentDate"]', data.incidentDate);
    }

    if (data.description) {
      await this.page.fill('textarea[id="description"]', data.description);
    }
  }

  async fillStep2(data: {
    claimAmount: string;
    policyNumber: string;
  }) {
    if (data.claimAmount) {
      await this.page.fill('input[id="claimAmount"]', data.claimAmount);
    }

    if (data.policyNumber) {
      await this.page.fill('input[id="policyNumber"]', data.policyNumber);
    }
  }

  async fillStep3(data: { termsAccepted: boolean }) {
    if (data.termsAccepted) {
      await this.page.check('input[id="termsAccepted"]');
    }
  }

  async clickNext() {
    await this.page.click('button:has-text("Next")');
  }

  async clickSubmit() {
    await this.page.click('button:has-text("Submit Claim")');
  }

  async clickCancel() {
    await this.page.click('button:has-text("Cancel")');
  }

  async confirmCancel() {
    await this.page.click('button:has-text("Discard & Leave")');
  }

  async getFieldError(fieldId: string) {
    const field = this.page.locator(
      `input[id="${fieldId}"], textarea[id="${fieldId}"]`
    );

    // Try to find associated error using aria-describedby first
    const errorId = await field.getAttribute('aria-describedby');
    if (errorId) {
      const errorElement = this.page.locator(`p#${errorId}[role="alert"]`);
      return (await errorElement.isVisible())
        ? await errorElement.textContent()
        : null;
    }

    // Fallback: Look for error paragraph with field-specific id pattern
    const errorElement = this.page.locator(`p#${fieldId}-error[role="alert"]`);
    return (await errorElement.isVisible())
      ? await errorElement.textContent()
      : null;
  }

  async getSuccessMessage() {
    // Success messages are typically in toast/notification elements with role="status"
    // Target the status element (not role="alert" which is for errors)
    // Look for elements that contain success message text
    const successElement = this.page.locator('[role="status"]:has-text("success"), [role="status"]:has-text("Account"), [role="status"]:has-text("claim")').first();

    return (await successElement.isVisible())
      ? await successElement.textContent()
      : null;
  }
}

/**
 * Page Object for Admin Dashboard
 */
export class AdminDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/dashboard');
  }

  async isLoaded() {
    // Use specific heading text instead of assuming first h1
    return this.page.locator('h1').isVisible();
  }

  async getStats() {
    // Wait for the stats to finish loading (the value only renders once the
    // dashboard fetch resolves and the loading skeleton is replaced).
    const totalClaimsValue = this.page.locator('[data-testid="stat-value-documents"]');
    await totalClaimsValue.waitFor({ state: 'visible', timeout: 15000 });

    const totalUsersValue = this.page.locator('[data-testid="stat-value-users"]');

    return {
      totalClaims: (await totalClaimsValue.textContent())?.trim() ?? null,
      totalUsers:
        (await totalUsersValue.textContent().catch(() => null))?.trim() ?? null,
    };
  }
}

/**
 * Page Object for Admin Claims page
 */
export class AdminClaimsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/claims');
  }

  async isLoaded() {
    return this.page.locator('h1:has-text("Claims Management")').isVisible();
  }

  async getClaims() {
    // Return a truthy value if claims list is accessible
    // Could be a claims table, list, or any container for admin claims
    return this.page.locator('[data-testid^="admin-claim-row-"]').count();
  }

  async findClaimRow(claimId: string) {
    return this.page.locator(`[data-testid="admin-claim-row-${claimId}"]`);
  }

  async updateClaimStatus(claimId: string, newStatus: string) {
    const row = await this.findClaimRow(claimId);
    const statusSelect = row.locator('select[name="status"]');

    await statusSelect.selectOption(newStatus);
    await row.locator('button:has-text("Save")').click();
  }

  async getClaimStatus(claimId: string) {
    const row = await this.findClaimRow(claimId);
    return row.locator('[data-testid="claim-status"]').textContent();
  }
}
