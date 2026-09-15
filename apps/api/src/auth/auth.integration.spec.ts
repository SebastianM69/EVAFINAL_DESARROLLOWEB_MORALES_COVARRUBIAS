import type { Server } from 'node:http';
import argon2 from 'argon2';
import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import type { PrismaService } from '../prisma/prisma.service.js';
import { HttpExceptionFilter } from '../common/http-exception.filter.js';
import { createValidationPipe } from '../common/validation-pipe.js';

const testDatabaseUrl = 'mysql://ventasfix:ventasfix_dev_password@localhost:3307/ventasfix_test';
const testJwtSecret = 'test-secret-for-ventasfix-integration-tests-32-chars';
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
let httpServer: Server;
let app: INestApplication;
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

function getHttpServer(application: INestApplication): Server {
  const server: unknown = application.getHttpServer();
  if (typeof server !== 'object' || server === null || !('listen' in server)) {
    throw new Error('Nest application did not expose an HTTP server.');
  }
  return server as Server;
}

describe('VentasFix auth HTTP contract', () => {
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
    await resetTestDatabase(prisma);
  }, 30_000);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });
  it('logs in through HTTP and keeps refresh token in an HttpOnly cookie', async () => {
    const response = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ventasfix.cl', password: adminPassword })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      user: {
        id: expect.any(Number),
        rut: '11111111-1',
        nombre: 'Administrador',
        apellido: 'VentasFix',
        email: 'admin@ventasfix.cl',
        role: 'ADMIN',
      },
    });
    expect(response.body).not.toHaveProperty('refreshToken');
    const refreshCookie = response.headers['set-cookie']?.[0];
    expect(refreshCookie).toEqual(expect.stringMatching(/^ventasfix_refresh=[^;]+;/));
    expect(refreshCookie).toContain('Path=/api/v1/auth');
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
  });

  it('returns the normalized validation envelope for invalid login input', async () => {
    const response = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '', role: 'ADMIN' })
      .expect(422);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        requestId: expect.any(String),
        path: '/api/v1/auth/login',
        timestamp: expect.any(String),
        fieldErrors: expect.objectContaining({
          email: expect.any(Array),
          password: expect.any(Array),
        }),
      }),
    );
  });

  it('rotates refresh cookies and rejects the previous cookie', async () => {
    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ventasfix.cl', password: adminPassword })
      .expect(200);
    const previousCookie = loginResponse.headers['set-cookie']?.[0];
    expect(previousCookie).toBeDefined();

    const refreshResponse = await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Cookie', previousCookie ?? '')
      .expect(200);
    const nextCookie = refreshResponse.headers['set-cookie']?.[0];
    expect(nextCookie).toBeDefined();
    expect(refreshResponse.body).not.toHaveProperty('refreshToken');

    const reusedResponse = await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Cookie', previousCookie ?? '')
      .expect(401);
    expect(reusedResponse.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        requestId: expect.any(String),
      }),
    );
  });

  it('blocks USER from the ADMIN-only users endpoint', async () => {
    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'user@ventasfix.cl', password: userPassword })
      .expect(200);
    const loginBody: unknown = loginResponse.body;

    const response = await request(httpServer)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${readAccessToken(loginBody)}`)
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
        requestId: expect.any(String),
      }),
    );
  });
});
