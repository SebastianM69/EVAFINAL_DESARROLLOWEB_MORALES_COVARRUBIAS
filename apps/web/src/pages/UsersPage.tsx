import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError, apiClient } from '../services/api-client';
import type { UserInput, UserRecord } from '../types/users';
import { StatusBanner } from '../components/StatusBanner';

const userSchema = z.object({
  rut: z.string().min(1, 'Ingresa el RUT.'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres.'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres.'),
  email: z.string().email('Ingresa un email válido.'),
  password: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

const emptyForm: UserForm = { rut: '', nombre: '', apellido: '', email: '', password: '' };

export function UsersPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const query = useQuery({ queryKey: ['users'], queryFn: () => apiClient.listUsers() });
  const form = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: emptyForm });
  const mutation = useMutation({
    mutationFn: async (input: UserInput) =>
      editing ? apiClient.updateUser(editing.id, input) : apiClient.createUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditing(null);
      form.reset(emptyForm);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  function selectUser(user: UserRecord): void {
    setEditing(user);
    form.reset({
      rut: user.rut,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      password: '',
    });
  }

  function cancelEdit(): void {
    setEditing(null);
    form.reset(emptyForm);
    mutation.reset();
  }

  async function submit(values: UserForm): Promise<void> {
    if (!editing && !values.password) {
      form.setError('password', { message: 'La contraseña es obligatoria al crear.' });
      return;
    }
    const input: UserInput = {
      rut: values.rut,
      nombre: values.nombre,
      apellido: values.apellido,
      email: values.email,
      ...(values.password ? { password: values.password } : {}),
    };
    try {
      await mutation.mutateAsync(input);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof UserForm, { message: messages[0] ?? 'Dato inválido.' });
        }
      }
    }
  }

  return (
    <section className="page-section">
      <p className="eyebrow">MANTENEDOR / ADMIN</p>
      <h1>Usuarios</h1>
      <p className="page-lede">
        Gestiona las personas que operan el backoffice. El rol se asigna en el servidor.
      </p>
      {mutation.error instanceof ApiError && !mutation.error.fieldErrors && (
        <StatusBanner message={mutation.error.message} tone="error" />
      )}
      <div className="users-layout">
        <form
          className="entity-form"
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          noValidate
        >
          <div className="form-heading">
            <div>
              <p className="eyebrow">{editing ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p>
              <h2>{editing ? 'Actualizar usuario' : 'Crear usuario'}</h2>
            </div>
            {editing && (
              <button className="quiet-button" type="button" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
          {(['rut', 'nombre', 'apellido', 'email', 'password'] as const).map((field) => (
            <label key={field} className="form-field">
              <span>
                {field === 'rut'
                  ? 'RUT'
                  : field === 'email'
                    ? 'Email corporativo'
                    : field === 'password'
                      ? `Contraseña${editing ? ' (opcional)' : ''}`
                      : field.charAt(0).toUpperCase() + field.slice(1)}
              </span>
              <input
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                {...form.register(field)}
              />
              {form.formState.errors[field]?.message && (
                <small className="field-error">{form.formState.errors[field]?.message}</small>
              )}
            </label>
          ))}
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </form>
        <div className="table-card">
          {query.isPending && <p className="table-state">Cargando usuarios…</p>}
          {query.error && (
            <p className="table-state table-state--error">No fue posible cargar los usuarios.</p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="table-state">No hay usuarios registrados.</p>
          )}
          {query.data && query.data.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>RUT</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.nombre} {user.apellido}
                        </strong>
                        <small>{user.email}</small>
                      </td>
                      <td>{user.rut}</td>
                      <td>
                        <span className="role-badge">{user.role}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => selectUser(user)}
                          >
                            Editar
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            disabled={user.role === 'ADMIN' || deleteMutation.isPending}
                            onClick={() => void deleteMutation.mutateAsync(user.id)}
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
