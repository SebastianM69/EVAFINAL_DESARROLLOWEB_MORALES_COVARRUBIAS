import type { AuthResponse, PublicUser } from '../types/auth';
import type { UserInput, UserRecord } from '../types/users';
import type { ProductRecord } from '../types/products';
import type { ClientRecord } from '../types/clients';
import type { DashboardSummary } from '../types/dashboard';

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const apiUrl =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl
    : 'http://localhost:3000/api/v1';

type ErrorPayload = {
  statusCode?: number;
  code?: string;
  message?: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(payload: ErrorPayload, statusCode: number) {
    super(payload.message ?? 'La solicitud no pudo procesarse.');
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = payload.code ?? 'INTERNAL_ERROR';
    this.requestId = payload.requestId;
    this.fieldErrors = payload.fieldErrors;
  }
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<AuthResponse> | null = null;

  setAccessToken(accessToken: string | null): void {
    this.accessToken = accessToken;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refresh(): Promise<AuthResponse> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.request<AuthResponse>(
        '/auth/refresh',
        {
          method: 'POST',
        },
        false,
      ).finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/logout', { method: 'POST' }, false);
    this.accessToken = null;
  }

  async me(): Promise<PublicUser> {
    return this.request<PublicUser>('/auth/me');
  }

  async dashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  async listUsers(): Promise<UserRecord[]> {
    return this.request<UserRecord[]>('/usuarios');
  }

  async createUser(input: UserInput): Promise<UserRecord> {
    return this.request<UserRecord>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateUser(id: number, input: UserInput): Promise<UserRecord> {
    return this.request<UserRecord>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request<void>(`/usuarios/${id}`, { method: 'DELETE' });
  }

  async listProducts(): Promise<ProductRecord[]> {
    return this.request<ProductRecord[]>('/productos');
  }

  async createProduct(formData: FormData): Promise<ProductRecord> {
    return this.request<ProductRecord>('/productos', { method: 'POST', body: formData });
  }

  async updateProduct(id: number, formData: FormData): Promise<ProductRecord> {
    return this.request<ProductRecord>(`/productos/${id}`, { method: 'PUT', body: formData });
  }

  async deleteProduct(id: number): Promise<void> {
    await this.request<void>(`/productos/${id}`, { method: 'DELETE' });
  }

  async listClients(): Promise<ClientRecord[]> {
    return this.request<ClientRecord[]>('/clientes');
  }

  async createClient(input: Omit<ClientRecord, 'id'>): Promise<ClientRecord> {
    return this.request<ClientRecord>('/clientes', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateClient(id: number, input: Omit<ClientRecord, 'id'>): Promise<ClientRecord> {
    return this.request<ClientRecord>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteClient(id: number): Promise<void> {
    await this.request<void>(`/clientes/${id}`, { method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    if (this.accessToken) {
      headers.set('authorization', `Bearer ${this.accessToken}`);
    }

    let response: Response;
    try {
      response = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
    } catch {
      throw new ApiError(
        { code: 'NETWORK_ERROR', message: 'No fue posible conectar con la API.' },
        0,
      );
    }

    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      path !== '/auth/login' &&
      path !== '/auth/refresh'
    ) {
      try {
        const refreshed = await this.refresh();
        this.accessToken = refreshed.accessToken;
        return this.request<T>(path, init, false);
      } catch {
        this.accessToken = null;
      }
    }

    if (!response.ok) {
      const payload = await this.readErrorPayload(response);
      throw new ApiError(payload, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async readErrorPayload(response: Response): Promise<ErrorPayload> {
    try {
      return (await response.json()) as ErrorPayload;
    } catch {
      return { code: 'INTERNAL_ERROR', message: 'La API devolvió una respuesta inválida.' };
    }
  }
}

export const apiClient = new ApiClient();
