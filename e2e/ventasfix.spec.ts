import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const apiBaseUrl = 'http://127.0.0.1:3000/api/v1';
const adminCredentials = {
  email: 'admin@ventasfix.cl',
  password: 'admin-password-123',
};
const e2eUser = {
  rut: '9876543-3',
  nombre: 'Usuario E2E',
  apellido: 'VentasFix',
  email: 'e2e-user@ventasfix.cl',
  password: 'e2e-user-password-123',
};
const createdUserEmail = 'e2e-created@ventasfix.cl';
const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function apiJson(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { status: response.status, body };
}

async function adminToken(): Promise<string> {
  const result = await apiJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify(adminCredentials),
  });
  expect(result.status).toBe(200);
  const body = result.body as { accessToken?: unknown };
  expect(typeof body.accessToken).toBe('string');
  return body.accessToken as string;
}

async function deleteMatchingRecords(
  path: string,
  token: string,
  matches: (record: Record<string, unknown>) => boolean,
): Promise<void> {
  const listed = await apiJson(path, { headers: { authorization: `Bearer ${token}` } });
  expect(listed.status).toBe(200);
  for (const value of Array.isArray(listed.body) ? listed.body : []) {
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'number' && matches(record)) {
      const deleted = await apiJson(`${path}/${record.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleted.status).toBe(204);
    }
  }
}

async function cleanupE2ERecords(token: string): Promise<void> {
  await deleteMatchingRecords('/usuarios', token, (record) =>
    [e2eUser.email, createdUserEmail].includes(String(record.email)),
  );
  await deleteMatchingRecords('/productos', token, (record) => record.sku === 'E2E-001');
  await deleteMatchingRecords('/clientes', token, (record) => record.rutEmpresa === '9876543-3');
}

async function prepareE2EUser(): Promise<void> {
  const token = await adminToken();
  await cleanupE2ERecords(token);

  const created = await apiJson('/usuarios', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(e2eUser),
  });
  expect(created.status).toBe(201);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo corporativo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar al backoffice' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.beforeAll(async () => {
  await prepareE2EUser();
});

test.afterAll(async () => {
  await cleanupE2ERecords(await adminToken());
});

test('ADMIN can navigate protected sections and create a user', async ({ page }) => {
  await login(page, adminCredentials.email, adminCredentials.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
  await page.getByLabel('RUT').fill('5555555-9');
  await page.getByLabel('Nombre').fill('Creado');
  await page.getByLabel('Apellido').fill('Desde UI');
  await page.getByLabel('Email corporativo').fill(createdUserEmail);
  await page.getByLabel('Contraseña').fill('ui-created-password-123');
  await page.getByRole('button', { name: 'Crear usuario' }).click();
  await expect(page.getByText(createdUserEmail)).toBeVisible();

  await page.getByRole('link', { name: 'Productos' }).click();
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await page.getByLabel('sku').fill('E2E-001');
  await page.getByLabel('nombre').fill('Producto E2E');
  await page.getByLabel('descripcionCorta').fill('Producto UI');
  await page.getByLabel('descripcionLarga').fill('Producto creado durante la prueba E2E.');
  await page.getByLabel('precioNeto').fill('100.00');
  await page.getByLabel('stockActual').fill('10');
  await page.getByLabel('stockMinimo').fill('2');
  await page.getByLabel('stockBajo').fill('4');
  await page.getByLabel('stockAlto').fill('20');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'product.png',
    mimeType: 'image/png',
    buffer: pngFixture,
  });
  await page.getByRole('button', { name: 'Crear producto' }).click();
  await expect(page.getByText('Producto E2E')).toBeVisible();

  await page.getByRole('link', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await page.getByLabel('RUT empresa').fill('9876543-3');
  await page.getByLabel('Rubro').fill('Servicios');
  await page.getByLabel('Razón social').fill('Cliente E2E SpA');
  await page.getByLabel('Teléfono').fill('912345678');
  await page.getByLabel('Dirección').fill('Avenida E2E 1');
  await page.getByLabel('Nombre de contacto').fill('Contacto E2E');
  await page.getByLabel('Email de contacto').fill('cliente-e2e@empresa.cl');
  await page.getByRole('button', { name: 'Crear cliente' }).click();
  await expect(page.getByText('Cliente E2E SpA')).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('USER cannot see or open Users and can use shared sections', async ({ page }) => {
  await login(page, e2eUser.email, e2eUser.password);
  await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);

  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();

  await page.getByRole('link', { name: 'Volver al dashboard' }).click();
  await page.getByRole('link', { name: 'Productos' }).click();
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await page.getByRole('link', { name: 'Clientes' }).click();
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
