import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './auth-context';
import { apiClient } from '../services/api-client';

vi.mock('../services/api-client', () => ({
  apiClient: {
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setAccessToken: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

const authResponse = {
  accessToken: 'access-token',
  user: {
    id: 1,
    rut: '11111111-1',
    nombre: 'Admin',
    apellido: 'VentasFix',
    email: 'admin@ventasfix.cl',
    role: 'ADMIN' as const,
  },
};

function AuthProbe(): React.JSX.Element {
  const { status, user } = useAuth();
  return <output aria-label="auth-status">{`${status}:${user?.email ?? 'none'}`}</output>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps CHECKING until refresh resolves, then authenticates', async () => {
    let resolveRefresh!: (value: typeof authResponse) => void;
    const refreshPromise = new Promise<typeof authResponse>((resolve) => {
      resolveRefresh = resolve;
    });
    mockedApiClient.refresh.mockReturnValue(refreshPromise);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    expect(screen.getByLabelText('auth-status')).toHaveTextContent('CHECKING:none');
    resolveRefresh(authResponse);

    await waitFor(() =>
      expect(screen.getByLabelText('auth-status')).toHaveTextContent(
        'AUTHENTICATED:admin@ventasfix.cl',
      ),
    );
  });

  it('clears access state when bootstrap refresh fails', async () => {
    mockedApiClient.refresh.mockRejectedValue(new Error('expired session'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('auth-status')).toHaveTextContent('UNAUTHENTICATED:none'),
    );
  });
});
