import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from './auth-context';

export function AdminRoute(): React.JSX.Element {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/403" replace />;
}
