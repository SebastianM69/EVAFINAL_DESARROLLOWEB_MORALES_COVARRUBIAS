import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';

export function AppLayout(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    await navigate('/login', { replace: true });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-mark">VF</div>
        <div>
          <p className="eyebrow">VENTASFIX</p>
          <p className="brand-title">Operaciones</p>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          <Link to="/dashboard">Dashboard</Link>
          {user?.role === 'ADMIN' && <Link to="/usuarios">Usuarios</Link>}
          <Link to="/productos">Productos</Link>
          <Link to="/clientes">Clientes</Link>
        </nav>
        <button className="sidebar-logout" type="button" onClick={() => void handleLogout()}>
          Cerrar sesión
        </button>
      </aside>
      <section className="content-column">
        <header className="topbar">
          <div>
            <p className="eyebrow">BACKOFFICE</p>
            <p className="topbar-title">Control comercial</p>
          </div>
          <div className="user-chip">
            <span className="user-chip__dot" aria-hidden="true" />
            <span>
              {user?.nombre} {user?.apellido}
            </span>
            <strong>{user?.role}</strong>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
