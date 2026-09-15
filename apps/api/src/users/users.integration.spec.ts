import type { Server } from 'node:http';

import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { createValidationPipe } from '../common/validation-pipe.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const testDatabaseUrl = 'mysql://ventasfix:ventasfix_dev_password@localhost:3307/ventasfix_test';
const testJwtSecret = 'test-secret-for-ventasfix-users-integration-32-chars';
const adminPassword = 'admin-password-123';
const userPassword = 'user-password-123';

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

function readAccessToken(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('accessToken' in body)) {
    throw new Error('Integration response did not contain accessToken.');
  }
  const accessToken = body.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Integration response contained an invalid accessToken.');
  }
  return accessToken;
}

async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshCookie: string }> {
  const response = await request(httpServer)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  const refreshCookie = response.headers['set-cookie']?.[0];
  if (!refreshCookie) {
    throw new Error('Integration response did not contain refresh cookie.');
  }
  return { accessToken: readAccessToken(response.body), refreshCookie };
}

async function findUserId(email: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Test user not found: ${email}`);
  }
  return user.id;
}

function userPayload(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    rut: '9876543-3',
    nombre: 'Nuevo',
    apellido: 'Usuario',
    email: 'nuevo@ventasfix.cl',
    password: 'new-user-password-123',
    ...overrides,
  };
}

describe('VentasFix users HTTP contract', () => {
  beforeAll(async () => {
    // AppModule must load after the test database environment is assigned.
    const { AppModule } = await import('../app.module.js');
    const { PrismaService: RuntimePrismaService } = await import('../prisma/prisma.service.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    httpServer = getHttpServer(app);
    prisma = app.get(RuntimePrismaService);
  }, 30_000);

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.product.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('allows ADMIN to list public users without password data', async () => {
    const admin = await login('admin@ventasfix.cl', adminPassword);

    const response = await request(httpServer)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'admin@ventasfix.cl', role: 'ADMIN' }),
        expect.objectContaining({ email: 'user@ventasfix.cl', role: 'USER' }),
      ]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ passwordHash: expect.anything() })]),
    );
  });

  it('blocks USER from direct access to the users endpoint', async () => {
    const user = await login('user@ventasfix.cl', userPassword);

    const response = await request(httpServer)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
        requestId: expect.any(String),
      }),
    );
  });

  it('creates a USER server-side and rejects role input', async () => {
    const admin = await login('admin@ventasfix.cl', adminPassword);

    const created = await request(httpServer)
      .post('/api/v1/usuarios')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(userPayload())
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        rut: '9876543-3',
        email: 'nuevo@ventasfix.cl',
        role: 'USER',
      }),
    );
    expect(created.body).not.toHaveProperty('passwordHash');

    const rejected = await request(httpServer)
      .post('/api/v1/usuarios')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(userPayload({ email: 'otro@ventasfix.cl', role: 'ADMIN' }))
      .expect(422);

    expect(rejected.body).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 422 }),
    );
  });

  it('returns conflict for duplicate email and protects the unique ADMIN', async () => {
    const admin = await login('admin@ventasfix.cl', adminPassword);

    const duplicate = await request(httpServer)
      .post('/api/v1/usuarios')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(userPayload({ rut: '9876543-3', email: 'user@ventasfix.cl' }))
      .expect(409);

    expect(duplicate.body).toEqual(
      expect.objectContaining({ code: 'RESOURCE_CONFLICT', statusCode: 409 }),
    );

    const adminId = await findUserId('admin@ventasfix.cl');
    const protectedDelete = await request(httpServer)
      .delete(`/api/v1/usuarios/${adminId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);

    expect(protectedDelete.body).toEqual(
      expect.objectContaining({ code: 'ADMIN_PROTECTED', statusCode: 409 }),
    );
  });

  it('revokes refresh sessions when ADMIN changes a password', async () => {
    const admin = await login('admin@ventasfix.cl', adminPassword);
    const user = await login('user@ventasfix.cl', userPassword);
    const userId = await findUserId('user@ventasfix.cl');

    await request(httpServer)
      .put(`/api/v1/usuarios/${userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        rut: '12345678-5',
        nombre: 'Usuario',
        apellido: 'Actualizado',
        email: 'user@ventasfix.cl',
        password: 'changed-user-password-123',
      })
      .expect(200);

    const refreshResponse = await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Cookie', user.refreshCookie)
      .expect(401);

    expect(refreshResponse.body).toEqual(
      expect.objectContaining({ code: 'UNAUTHENTICATED', statusCode: 401 }),
    );
  });

  it('deletes a USER and then returns 404 for its id', async () => {
    const admin = await login('admin@ventasfix.cl', adminPassword);
    const userId = await findUserId('user@ventasfix.cl');

    await request(httpServer)
      .delete(`/api/v1/usuarios/${userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(204);

    const missing = await request(httpServer)
      .get(`/api/v1/usuarios/${userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);

    expect(missing.body).toEqual(
      expect.objectContaining({ code: 'RESOURCE_NOT_FOUND', statusCode: 404 }),
    );
  });
});

function getHttpServer(application: INestApplication): Server {
  const server: unknown = application.getHttpServer();
  if (typeof server !== 'object' || server === null || !('listen' in server)) {
    throw new Error('Nest application did not expose an HTTP server.');
  }
  return server as Server;
}
