import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { StatusBanner } from '../components/StatusBanner';
import { ApiError, apiClient } from '../services/api-client';
import type { ClientRecord } from '../types/clients';

const fields = [
  'rutEmpresa',
  'rubro',
  'razonSocial',
  'telefono',
  'direccion',
  'nombreContacto',
  'emailContacto',
] as const;
type ClientInput = Omit<ClientRecord, 'id'>;

export function ClientsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const query = useQuery({ queryKey: ['clients'], queryFn: () => apiClient.listClients() });
  const mutation = useMutation({
    mutationFn: (input: ClientInput) =>
      editing ? apiClient.updateClient(editing.id, input) : apiClient.createClient(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteClient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
      string,
      string
    >;
    const input = Object.fromEntries(
      fields.map((field) => [field, values[field] ?? '']),
    ) as ClientInput;
    await mutation.mutateAsync(input);
    event.currentTarget.reset();
  }

  return (
    <section className="page-section">
      <p className="eyebrow">MANTENEDOR / ADMIN + USER</p>
      <h1>Clientes</h1>
      <p className="page-lede">
        Mantén la información comercial de las empresas con RUT normalizado.
      </p>
      {mutation.error instanceof ApiError && (
        <StatusBanner message={mutation.error.message} tone="error" />
      )}
      <div className="clients-layout">
        <form
          key={editing?.id ?? 'new'}
          className="entity-form"
          onSubmit={(event) => void submit(event)}
        >
          <div className="form-heading">
            <div>
              <p className="eyebrow">{editing ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p>
              <h2>{editing ? 'Actualizar cliente' : 'Crear cliente'}</h2>
            </div>
            {editing && (
              <button className="quiet-button" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            )}
          </div>
          {fields.map((field) => (
            <label className="form-field" key={field}>
              <span>{field}</span>
              <input
                name={field}
                type={field === 'emailContacto' ? 'email' : 'text'}
                defaultValue={editing?.[field] ?? ''}
                required
              />
            </label>
          ))}
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </form>
        <div className="table-card">
          {query.isPending && <p className="table-state">Cargando clientes…</p>}
          {query.error && (
            <p className="table-state table-state--error">No fue posible cargar los clientes.</p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="table-state">No hay clientes registrados.</p>
          )}
          {query.data && query.data.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Razón social</th>
                    <th>RUT</th>
                    <th>Contacto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>{client.razonSocial}</strong>
                        <small>{client.rubro}</small>
                      </td>
                      <td>{client.rutEmpresa}</td>
                      <td>
                        <strong>{client.nombreContacto}</strong>
                        <small>{client.emailContacto}</small>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => setEditing(client)}
                          >
                            Editar
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => void deleteMutation.mutateAsync(client.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
