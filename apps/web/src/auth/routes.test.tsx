import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AdminRoute } from './admin-route';
import { useAuth } from './auth-context';
import type { PublicUser } from '../types/auth';
import { ProtectedRoute } from './protected-route';
import { AppLayout } from '../components/AppLayout';

vi.mock('./auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const adminUser = {
  id: 1,
  rut: '11111111-1',
  nombre: 'Admin',
  apellido: 'VentasFix',
  email: 'admin@ventasfix.cl',
  role: 'ADMIN' as const,
};

const regularUser = { ...adminUser, id: 2, role: 'USER' as const };

function authValue(
  status: 'CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED',
  user: PublicUser | null = null,
) {
  return {
    status,
    user,
    login: vi.fn(),
    logout: vi.fn(),
  };
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the checking state visible without redirecting', () => {
    mockedUseAuth.mockReturnValue(authValue('CHECKING'));

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<span>Private content</span>} />
          </Route>
          <Route path="/login" element={<span>Login page</span>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Comprobando sesión…')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    mockedUseAuth.mockReturnValue(authValue('UNAUTHENTICATED'));

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<span>Private content</span>} />
          </Route>
          <Route path="/login" element={<span>Login page</span>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });
});

describe('AdminRoute and AppLayout', () => {
  it('redirects USER from the users route and exposes no users navigation link', () => {
    mockedUseAuth.mockReturnValue(authValue('AUTHENTICATED', regularUser));

    render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<AdminRoute />}>
              <Route path="/usuarios" element={<span>Users content</span>} />
            </Route>
          </Route>
          <Route path="/403" element={<span>Forbidden page</span>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
    expect(screen.queryByText('Users content')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('shows users navigation and content for ADMIN', () => {
    mockedUseAuth.mockReturnValue(authValue('AUTHENTICATED', adminUser));

    render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<AdminRoute />}>
              <Route path="/usuarios" element={<span>Users content</span>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Users content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  });
});
