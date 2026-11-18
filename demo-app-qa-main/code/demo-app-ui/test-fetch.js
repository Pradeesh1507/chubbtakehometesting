const { test, expect } = require('@playwright/test');

test('can load signup page', async ({ page }) => {
  await page.goto('http://localhost:3101/signup');
  const heading = await page.locator('h1:has-text("Create Account")');
  expect(await heading.isVisible()).toBeTruthy();
  
  // Check if the page can make API calls by inspecting network
  const response = await page.evaluate(() => {
    return fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@test.com', password: 'Test123!' })
    }).then(r => ({ status: r.status, text: r.statusText }))
      .catch(e => ({ error: e.message }));
  });
  
  console.log('Fetch response:', response);
});
