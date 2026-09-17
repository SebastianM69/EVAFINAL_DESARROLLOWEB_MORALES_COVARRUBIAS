import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError, apiClient, resolveMediaUrl } from '../services/api-client';
import type { ProductRecord } from '../types/products';
import { StatusBanner } from '../components/StatusBanner';

const fields = [
  'sku',
  'nombre',
  'descripcionCorta',
  'descripcionLarga',
  'precioNeto',
  'stockActual',
  'stockMinimo',
  'stockBajo',
  'stockAlto',
] as const;

export function ProductsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const query = useQuery({ queryKey: ['products'], queryFn: () => apiClient.listProducts() });
  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      editing ? apiClient.updateProduct(editing.id, formData) : apiClient.createProduct(formData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (editing && !(form.get('image') instanceof File && (form.get('image') as File).size > 0)) {
      form.delete('image');
    }
    try {
      await mutation.mutateAsync(form);
      event.currentTarget.reset();
    } catch {
      // The banner below exposes the normalized API error.
    }
  }

  function editProduct(product: ProductRecord): void {
    setEditing(product);
  }

  return (
    <section className="page-section">
      <p className="eyebrow">MANTENEDOR / ADMIN + USER</p>
      <h1>Productos</h1>
      <p className="page-lede">
        Precio de venta calculado por servidor y una imagen validada por firma real.
      </p>
      {mutation.error instanceof ApiError && (
        <StatusBanner message={mutation.error.message} tone="error" />
      )}
      <div className="products-layout">
        <form
          key={editing?.id ?? 'new'}
          className="entity-form product-form"
          onSubmit={(event) => void submit(event)}
          encType="multipart/form-data"
        >
          <div className="form-heading">
            <div>
              <p className="eyebrow">{editing ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p>
              <h2>{editing ? 'Actualizar producto' : 'Crear producto'}</h2>
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
                defaultValue={editing ? String(editing[field]) : ''}
                type={field.startsWith('stock') ? 'number' : 'text'}
                required
              />
            </label>
          ))}
          <label className="form-field">
            <span>Imagen {editing ? '(opcional)' : '(obligatoria)'}</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!editing}
            />
          </label>
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </form>
        <div className="table-card">
          {query.isPending && <p className="table-state">Cargando productos…</p>}
          {query.error && (
            <p className="table-state table-state--error">No fue posible cargar los productos.</p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="table-state">No hay productos registrados.</p>
          )}
          {query.data && query.data.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Venta</th>
                    <th>Stock</th>
                    <th>Imagen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.nombre}</strong>
                        <small>{product.sku}</small>
                      </td>
                      <td>{product.precioVenta}</td>
                      <td>{product.stockActual}</td>
                      <td>
                        <img
                          className="product-thumb"
                          src={resolveMediaUrl(product.imageUrl)}
                          crossOrigin="anonymous"
                          alt=""
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editProduct(product)}
                          >
                            Editar
                          </button>
                          <button
                            className="danger-button"
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => void deleteMutation.mutateAsync(product.id)}
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
