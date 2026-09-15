import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './auth-context';

export function ProtectedRoute(): React.JSX.Element {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'CHECKING') {
    return <div className="route-state">Comprobando sesión…</div>;
  }
  if (status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
