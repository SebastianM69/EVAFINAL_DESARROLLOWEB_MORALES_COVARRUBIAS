import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AdminRoute } from './auth/admin-route';
import { AuthProvider } from './auth/auth-context';
import { ProtectedRoute } from './auth/protected-route';
import { AppLayout } from './components/AppLayout';
import { DashboardPage, ForbiddenPage, NotFoundPage } from './pages/BasePages';
import { ClientsPage } from './pages/ClientsPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';

const queryClient = new QueryClient();

export function AppRouter(): React.JSX.Element {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/usuarios" element={<UsersPage />} />
                </Route>
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/productos" element={<ProductsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
