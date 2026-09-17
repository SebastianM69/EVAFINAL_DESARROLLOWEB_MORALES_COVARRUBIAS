import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../services/api-client';
import { ClientsPage } from './ClientsPage';

const mockedApi = vi.hoisted(() => ({
  listClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
}));

vi.mock('../services/api-client', () => ({
  ApiError: class MockApiError extends Error {
    readonly fieldErrors: Record<string, string[]> | undefined;

    constructor(payload: { fieldErrors?: Record<string, string[]> }) {
      super('La solicitud contiene datos inválidos.');
      this.name = 'ApiError';
      this.fieldErrors = payload.fieldErrors;
    }
  },
  apiClient: mockedApi,
}));

function renderClients(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ClientsPage />
    </QueryClientProvider>,
  );
}

describe('ClientsPage', () => {
  it('shows API validation messages beside their fields', async () => {
    mockedApi.listClients.mockResolvedValue([]);
    mockedApi.createClient.mockRejectedValue(
      new ApiError({ fieldErrors: { rutEmpresa: ['El RUT de empresa no es válido.'] } }, 422),
    );

    renderClients();

    const values = {
      rutEmpresa: '12.345.678-9',
      rubro: 'Tecnología',
      razonSocial: 'Empresa inválida SpA',
      telefono: '+56 (9) 1234-5678',
      direccion: 'Avenida Principal 123',
      nombreContacto: 'Ana Contacto',
      emailContacto: 'contacto@empresa.cl',
    };
    const labels = {
      rutEmpresa: 'RUT empresa',
      rubro: 'Rubro',
      razonSocial: 'Razón social',
      telefono: 'Teléfono',
      direccion: 'Dirección',
      nombreContacto: 'Nombre de contacto',
      emailContacto: 'Email de contacto',
    };
    for (const [field, value] of Object.entries(values)) {
      fireEvent.change(
        screen.getByRole('textbox', { name: labels[field as keyof typeof labels] }),
        {
          target: { value },
        },
      );
    }
    fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => {
      expect(screen.getByText('El RUT de empresa no es válido.')).toBeInTheDocument();
    });
    expect(screen.queryByText('La solicitud contiene datos inválidos.')).not.toBeInTheDocument();
  });
});
