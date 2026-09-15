import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { apiClient } from '../services/api-client';

export function DashboardPage(): React.JSX.Element {
  const query = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.dashboardSummary(),
  });
  const summary = query.data;

  return (
    <section className="page-section">
      <p className="eyebrow">RESUMEN OPERATIVO</p>
      <h1>Dashboard</h1>
      <p className="page-lede">La lectura diaria de VentasFix empieza aquí.</p>
      {query.isError && (
        <p className="table-state table-state--error">No fue posible cargar el resumen.</p>
      )}
      <div className="metric-grid">
        <article className="metric-card">
          <span>Usuarios</span>
          <strong>{summary?.usuarios ?? '—'}</strong>
          <small>Registros actuales</small>
        </article>
        <article className="metric-card">
          <span>Productos</span>
          <strong>{summary?.productos ?? '—'}</strong>
          <small>Catálogo actual</small>
        </article>
        <article className="metric-card">
          <span>Clientes</span>
          <strong>{summary?.clientes ?? '—'}</strong>
          <small>Empresas registradas</small>
        </article>
      </div>
    </section>
  );
}

export function ResourcePlaceholder({ title }: { title: string }): React.JSX.Element {
  return (
    <section className="page-section">
      <p className="eyebrow">MANTENEDOR</p>
      <h1>{title}</h1>
      <p className="page-lede">Esta sección está preparada para su vertical funcional.</p>
      <div className="empty-state">
        <strong>Espacio listo para operar</strong>
        <span>La conexión con la API se incorpora en el siguiente milestone.</span>
      </div>
    </section>
  );
}

export function ForbiddenPage(): React.JSX.Element {
  return (
    <section className="page-section state-page">
      <span className="state-code">403</span>
      <h1>Acceso restringido</h1>
      <p>No tienes permisos para consultar esta sección.</p>
      <Link className="text-link" to="/dashboard">
        Volver al dashboard
      </Link>
    </section>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <section className="page-section state-page">
      <span className="state-code">404</span>
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a una pantalla disponible.</p>
      <Link className="text-link" to="/dashboard">
        Volver al dashboard
      </Link>
    </section>
  );
}
