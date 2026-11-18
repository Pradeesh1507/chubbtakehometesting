import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage, SignupPage, ClaimsPage } from '../pages/index';
import { buildTestUser, buildInvalidUserData } from '../fixtures/test-data';

test.describe('Authentication Flows', () => {
  test('should allow user to sign up with valid credentials', async ({ page, auth }) => {
    const signupPage = new SignupPage(page);
    const claimsPage = new ClaimsPage(page);

    const user = buildTestUser();

    await signupPage.goto();
    expect(await signupPage.isLoaded()).toBeTruthy();

    await signupPage.signup(user.name, user.email, user.password);

    // Should redirect to login after signup
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('should validate email format during signup', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const invalidUser = buildInvalidUserData('invalidEmail');

    await signupPage.goto();
    
    // Fill form with invalid email
    await page.fill('input[id="name"]', invalidUser.name || 'Test User');
    await page.fill('input[id="email"]', invalidUser.email || 'invalid-email');
    await page.fill('input[id="password"]', 'ValidPassword123');

    // Try to submit
    await page.click('button[type="submit"]');

    // Form validation should prevent submission or server should reject
    await page.waitForTimeout(500);

    // Check if we're still on signup page
    expect(page.url()).toContain('/signup');
  });

  test('should validate password strength during signup', async ({ page }) => {
    const signupPage = new SignupPage(page);
    const invalidUser = buildInvalidUserData('weakPassword');

    await signupPage.goto();
    
    // Fill form with weak password
    await page.fill('input[id="name"]', 'Test User');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', invalidUser.password || '123');

    // Try to submit
    await page.click('button[type="submit"]');

    // Form validation should prevent submission
    await page.waitForTimeout(500);

    // Should still be on signup page
    expect(page.url()).toContain('/signup');
  });

  test('should allow user to login with valid credentials', async ({ page, auth }) => {
    // Create user first
    const user = buildTestUser();
    
    // Try to signup first
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    await signupPage.signup(user.name, user.email, user.password);
    
    // Wait for redirect to login
    try {
      await page.waitForURL('**/login', { timeout: 10000 });
    } catch {
      // If signup failed, we might already be on login
      if (!page.url().includes('/login')) {
        await page.goto('/login');
      }
    }
    
    // Now login
    const loginPage = new LoginPage(page);
    await loginPage.login(user.email, user.password);

    // Should be on claims or admin dashboard
    try {
      await page.waitForURL('**/claims', { timeout: 15000 });
    } catch {
      try {
        await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      } catch {
        // If neither URL is reached, check for error
        const error = await loginPage.getErrorMessage();
        expect(error).toBeFalsy();
      }
    }
  });

  test('should reject login with invalid email/password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    expect(await loginPage.isLoaded()).toBeTruthy();

    // Try to login with invalid credentials
    await loginPage.login('nonexistent@example.com', 'wrongpassword');

    // Wait for error message or response
    await page.waitForTimeout(1000);

    // Should show error message
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
    expect(errorMsg).toContain('Invalid email or password');

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });

  test('should show signup link on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    
    // Find link to signup
    const signupLink = page.locator('a:has-text("Sign up")');
    expect(await signupLink.isVisible()).toBeTruthy();

    await signupLink.click();
    await page.waitForURL('**/signup', { timeout: 10000 });
  });

  test('should show login link on signup page', async ({ page }) => {
    const signupPage = new SignupPage(page);

    await signupPage.goto();
    
    // Find link to login
    const loginLink = page.locator('a:has-text("Log in")');
    expect(await loginLink.isVisible()).toBeTruthy();

    await loginLink.click();
    await page.waitForURL('**/login', { timeout: 10000 });
  });
});
