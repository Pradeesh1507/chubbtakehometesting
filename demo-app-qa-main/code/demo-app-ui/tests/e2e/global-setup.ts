
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('Global setup starting');

  const baseURL = config.projects[0]?.use.baseURL;

  console.log('Base URL:', baseURL);

  if (!baseURL) {
    throw new Error('Playwright baseURL is not configured');
  }

  console.log('Global setup completed');
}

export default globalSetup;
