import { test as base, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * Test fixture for authentication in E2E tests
 * 
 * Provides methods to:
 * - Create new users via signup
 * - Login with existing credentials
 * - Logout
 * - Get current user context
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

interface AuthFixture {
  /**
   * Create a new test user via signup and login automatically
   */
  createAndLoginUser: (overrides?: Partial<TestUser>) => Promise<TestUser>;
  
  /**
   * Login with given credentials
   */
  loginUser: (email: string, password: string) => Promise<void>;
  
  /**
   * Logout current user
   */
  logout: () => Promise<void>;
  
  /**
   * Get a test user object without creating it
   */
  getTestUser: (overrides?: Partial<TestUser>) => TestUser;
}

function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'TempPassword123!', // Use consistent test password
    role: 'user',
    ...overrides,
  };
}

export const test = base.extend<{ auth: AuthFixture }>({
  auth: async ({ page }, use) => {
    const auth: AuthFixture = {
      async createAndLoginUser(overrides?: Partial<TestUser>) {
        const user = generateTestUser(overrides);

        // Go to signup page
        await page.goto('/signup');

        // Wait for page to load
        await page.waitForSelector('h1:has-text("Create Account")');

        // Fill signup form
        await page.fill('input[id="name"]', user.name);
        await page.fill('input[id="email"]', user.email);
        await page.fill('input[id="password"]', user.password);

        // Submit form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // After signup succeeds, app shows toast and redirects
        // Wait for either: success navigation or error display
        try {
          // Success case: redirects to login page
          await page.waitForURL('**/login', { timeout: 10000 });
        } catch {
          // If redirect doesn't happen, check for errors
          // Use specific selector to avoid matching Next.js route announcer
          const errorAlert = page.locator('p[role="alert"][class*="error"]');
          if (await errorAlert.isVisible()) {
            const error = await errorAlert.textContent();
            throw new Error(`Signup failed: ${error}`);
          }
          throw new Error('Signup failed: No redirect and no error message');
        }

        // Now login with created credentials
        await auth.loginUser(user.email, user.password);

        return user;
      },

      async loginUser(email: string, password: string) {
        // Keycloak brute-force "quick login" protection can transiently reject
        // an otherwise-valid login with a 401 when the same account is logged
        // in by near-simultaneous requests (e.g. parallel tests sharing the
        // seeded admin account). Sequential/spaced logins always succeed, so we
        // retry a transient invalid-credentials response with jittered backoff.
        const maxAttempts = 4;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // Go to login page
          await page.goto('/login');

          // Wait for page to load
          await page.waitForSelector('h1:has-text("Log In")');

          // Fill login form
          await page.fill('input[id="email"]', email);
          await page.fill('input[id="password"]', password);

          // Submit form
          const submitButton = page.locator('button[type="submit"]');
          await submitButton.click();

          // Wait for navigation to protected page (claims or admin dashboard)
          try {
            await Promise.race([
              page.waitForURL('**/claims', { timeout: 15000 }),
              page.waitForURL('**/admin/dashboard', { timeout: 15000 }),
            ]);

            // Wait for page to settle (using loadState with shorter timeout)
            // Don't use 'networkidle' as background requests may not complete
            try {
              await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
            } catch {
              // Page may still be loading, but we've navigated successfully
            }
            return;
          } catch {
            // Check if there's an error message instead
            // Use specific selector to avoid matching Next.js route announcer
            const errorAlert = page.locator('p[role="alert"][class*="error"]');
            let errorText: string | null = null;
            if (await errorAlert.isVisible()) {
              errorText = await errorAlert.textContent();
            }

            lastError = new Error(
              `Login failed: ${errorText ?? 'No navigation to protected page'}`
            );

            // Only the transient invalid-credentials throttle is retryable.
            const isTransient = !!errorText && /invalid email or password/i.test(errorText);
            if (!isTransient || attempt === maxAttempts) {
              throw lastError;
            }

            // Jittered backoff so concurrent retries de-synchronise.
            const delay = 800 + Math.floor(Math.random() * 1500);
            await page.waitForTimeout(delay);
          }
        }

        throw lastError ?? new Error('Login failed');
      },

      async logout() {
        // Click logout button (location may vary by app)
        const logoutButton = page.locator('button:has-text("Logout")');
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
        }
        
        // Wait for redirect to login
        await page.waitForURL('**/login');
      },

      getTestUser(overrides?: Partial<TestUser>) {
        return generateTestUser(overrides);
      },
    };

    await use(auth);
  },
});

export { expect };
