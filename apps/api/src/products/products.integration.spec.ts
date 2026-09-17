import type { Server } from 'node:http';
import { readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { createValidationPipe } from '../common/validation-pipe.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const testDatabaseUrl = 'mysql://ventasfix:ventasfix_dev_password@localhost:3307/ventasfix_test';
const testJwtSecret = 'test-secret-for-ventasfix-products-integration-32-chars';
const adminPassword = 'admin-password-123';
const userPassword = 'user-password-123';
const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const mediaRoot = resolve(process.cwd(), 'media', 'products');

process.env.NODE_ENV = 'test';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET = testJwtSecret;
process.env.JWT_ACCESS_TTL = '15m';
process.env.REFRESH_TOKEN_TTL_DAYS = '7';
process.env.SWAGGER_ENABLED = 'false';

let app: INestApplication;
let httpServer: Server;
let prisma: PrismaService;
let initialMediaFiles: Set<string>;

async function resetTestDatabase(prismaService: PrismaService): Promise<void> {
  await prismaService.authSession.deleteMany();
  await prismaService.product.deleteMany();
  await prismaService.client.deleteMany();
  await prismaService.user.deleteMany();

  const [adminPasswordHash, userPasswordHash] = await Promise.all([
    argon2.hash(adminPassword, { type: argon2.argon2id }),
    argon2.hash(userPassword, { type: argon2.argon2id }),
  ]);

  await prismaService.user.createMany({
    data: [
      {
        rut: '11111111-1',
        nombre: 'Administrador',
        apellido: 'VentasFix',
        email: 'admin@ventasfix.cl',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
      {
        rut: '12345678-5',
        nombre: 'Usuario',
        apellido: 'VentasFix',
        email: 'user@ventasfix.cl',
        passwordHash: userPasswordHash,
        role: 'USER',
      },
    ],
  });
}

function productFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    sku: 'ABC-001',
    nombre: 'Producto de prueba',
    descripcionCorta: 'Descripción corta',
    descripcionLarga: 'Descripción larga del producto de prueba',
    precioNeto: '100.00',
    stockActual: '10',
    stockMinimo: '2',
    stockBajo: '4',
    stockAlto: '20',
    ...overrides,
  };
}

function readProductId(body: unknown): number {
  if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'number') {
    throw new Error('Integration response did not contain a product id.');
  }
  return body.id;
}

function getHttpServer(application: INestApplication): Server {
  const server: unknown = application.getHttpServer();
  if (typeof server !== 'object' || server === null || !('listen' in server)) {
    throw new Error('Nest application did not expose an HTTP server.');
  }
  return server as Server;
}

function readImageUrl(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('imageUrl' in body)) {
    throw new Error('Integration response did not contain imageUrl.');
  }
  const imageUrl = body.imageUrl;
  if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
    throw new Error('Integration response contained an invalid imageUrl.');
  }
  return imageUrl;
}

async function login(email: string, password: string): Promise<string> {
  const response = await request(httpServer)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  const body: unknown = response.body;
  if (
    typeof body !== 'object' ||
    body === null ||
    !('accessToken' in body) ||
    typeof body.accessToken !== 'string'
  ) {
    throw new Error('Integration response did not contain accessToken.');
  }
  return body.accessToken;
}

async function createProduct(token: string, overrides: Record<string, string> = {}) {
  return request(httpServer)
    .post('/api/v1/productos')
    .set('Authorization', `Bearer ${token}`)
    .field(productFields(overrides))
    .attach('image', pngFixture, { filename: 'product.png', contentType: 'image/png' })
    .expect(201);
}

describe('VentasFix products HTTP contract', () => {
  beforeAll(async () => {
    // AppModule must load after the test database environment is assigned.
    const { AppModule } = await import('../app.module.js');
    const { PrismaService: RuntimePrismaService } = await import('../prisma/prisma.service.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'media/products/:filename', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    httpServer = getHttpServer(app);
    prisma = app.get(RuntimePrismaService);
    initialMediaFiles = new Set(await readdir(mediaRoot).catch(() => []));
  }, 30_000);

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.product.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    for (const filename of await readdir(mediaRoot).catch(() => [])) {
      if (!initialMediaFiles.has(filename)) {
        await unlink(join(mediaRoot, filename)).catch(() => undefined);
      }
    }
    await app.close();
  });

  it('calculates IVA server-side and exposes only imageUrl', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);
    const response = await createProduct(adminToken);

    expect(response.body).toEqual(
      expect.objectContaining({
        sku: 'ABC-001',
        precioNeto: '100.00',
        precioVenta: '119.00',
        stockActual: 10,
        stockMinimo: 2,
        stockBajo: 4,
        stockAlto: 20,
        imageUrl: expect.stringMatching(/^\/media\/products\/[0-9a-f-]{36}\.png$/),
      }),
    );
    expect(response.body).not.toHaveProperty('imagePath');
    expect(response.body).not.toHaveProperty('precioVenta', '120.00');

    const media = await request(httpServer).get(readImageUrl(response.body)).expect(200);
    expect(media.headers['content-type']).toMatch(/^image\/png/);
    expect(media.headers['cache-control']).toContain('immutable');
    expect(media.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('rejects missing images and excessive decimal precision', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    const missingImage = await request(httpServer)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .field(productFields())
      .expect(422);
    expect(missingImage.body).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 422 }),
    );

    const excessivePrecision = await request(httpServer)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .field(productFields({ sku: 'ABC-002', precioNeto: '100.123' }))
      .attach('image', pngFixture, { filename: 'product.png', contentType: 'image/png' })
      .expect(422);
    expect(excessivePrecision.body).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 422 }),
    );
  });

  it('updates without an image while preserving the previous image', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);
    const created = await createProduct(adminToken);
    const productId = readProductId(created.body);
    const previousImageUrl = readImageUrl(created.body);

    const updated = await request(httpServer)
      .put(`/api/v1/productos/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field(productFields({ nombre: 'Producto actualizado', precioNeto: '10.00' }))
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        nombre: 'Producto actualizado',
        precioNeto: '10.00',
        precioVenta: '11.90',
        imageUrl: previousImageUrl,
      }),
    );
  });

  it('replaces the image on update and removes it on delete', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);
    const created = await createProduct(adminToken);
    const productId = readProductId(created.body);
    const previousImageUrl = readImageUrl(created.body);

    const updated = await request(httpServer)
      .put(`/api/v1/productos/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field(productFields({ sku: 'ABC-003' }))
      .attach('image', pngFixture, { filename: 'replacement.png', contentType: 'image/png' })
      .expect(200);
    const nextImageUrl = readImageUrl(updated.body);

    expect(nextImageUrl).not.toBe(previousImageUrl);
    await request(httpServer).get(previousImageUrl).expect(400);

    await request(httpServer)
      .delete(`/api/v1/productos/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await request(httpServer).get(nextImageUrl).expect(400);
  });

  it('allows USER to read products', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);
    await createProduct(adminToken);
    const userToken = await login('user@ventasfix.cl', userPassword);

    const response = await request(httpServer)
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ sku: 'ABC-001' })]),
    );
  });
});
