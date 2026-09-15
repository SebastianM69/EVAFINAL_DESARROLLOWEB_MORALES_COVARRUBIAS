import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './BasePages';

const mockedDashboardSummary = vi.hoisted(() => vi.fn());

vi.mock('../services/api-client', () => ({
  apiClient: {
    dashboardSummary: mockedDashboardSummary,
  },
}));

function renderDashboard(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading placeholders before the API responds', () => {
    mockedDashboardSummary.mockReturnValue(new Promise(() => undefined));

    renderDashboard();

    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('renders real metric counts when the API succeeds', async () => {
    mockedDashboardSummary.mockResolvedValue({ usuarios: 2, productos: 1, clientes: 3 });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders a safe error state when the API fails', async () => {
    mockedDashboardSummary.mockRejectedValue(new Error('network failure'));

    renderDashboard();

    expect(await screen.findByText('No fue posible cargar el resumen.')).toBeInTheDocument();
  });
});
