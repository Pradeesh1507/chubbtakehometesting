import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
const mockLogout = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/src/features/auth/stores/use-auth-store', () => ({
  useAuthStore: () => ({
    user: { userId: 'u1', email: 'c@demo.com', name: 'Test Claimant', role: 'CLAIMANT' },
    isAuthenticated: true,
    logout: mockLogout,
  }),
}));

vi.mock('@/src/features/theme/components/theme-picker', () => ({
  ThemePicker: () => null,
}));

vi.mock('@/src/components/connection-status-indicator', () => ({
  ConnectionStatusIndicator: () => null,
}));

import { AppHeader } from './app-header';

function clearCookies() {
  document.cookie
    .split(';')
    .forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}

describe('AppHeader logout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLogout.mockClear();
    clearCookies();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the X-XSRF-TOKEN header (from the XSRF-TOKEN cookie) when logging out', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-abc-123; path=/';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(<AppHeader />);
    await userEvent.click(screen.getByRole('button', { name: /Logout/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers).toEqual({ 'X-XSRF-TOKEN': 'csrf-abc-123' });

    // Local auth state is cleared and the user is redirected to login.
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('still logs out (without a CSRF header) when no XSRF-TOKEN cookie is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(<AppHeader />);
    await userEvent.click(screen.getByRole('button', { name: /Logout/i }));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toBeUndefined();
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
