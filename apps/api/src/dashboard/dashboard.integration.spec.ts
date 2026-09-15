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
const testJwtSecret = 'test-secret-for-ventasfix-dashboard-integration-32-chars';
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

  await prismaService.product.create({
    data: {
      sku: 'DASH-001',
      nombre: 'Producto Dashboard',
      descripcionCorta: 'Producto de conteo',
      descripcionLarga: 'Producto usado para probar los conteos del dashboard.',
      imagePath: 'products/dashboard.png',
      precioNeto: '100.00',
      precioVenta: '119.00',
      stockActual: 1,
      stockMinimo: 1,
      stockBajo: 2,
      stockAlto: 5,
    },
  });

  await prismaService.client.create({
    data: {
      rutEmpresa: '9876543-3',
      rubro: 'Servicios',
      razonSocial: 'Cliente Dashboard SpA',
      telefono: '912345678',
      direccion: 'Avenida Dashboard 1',
      nombreContacto: 'Contacto Dashboard',
      emailContacto: 'dashboard@cliente.cl',
    },
  });
}

function getHttpServer(application: INestApplication): Server {
  const server: unknown = application.getHttpServer();
  if (typeof server !== 'object' || server === null || !('listen' in server)) {
    throw new Error('Nest application did not expose an HTTP server.');
  }
  return server as Server;
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

describe('VentasFix dashboard HTTP contract', () => {
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

  it('returns real counts for ADMIN', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    const response = await request(httpServer)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual({ usuarios: 2, productos: 1, clientes: 1 });
  });

  it('returns the same real counts for USER', async () => {
    const userToken = await login('user@ventasfix.cl', userPassword);

    const response = await request(httpServer)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toEqual({ usuarios: 2, productos: 1, clientes: 1 });
  });

  it('rejects unauthenticated dashboard access', async () => {
    const response = await request(httpServer).get('/api/v1/dashboard/summary').expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({ code: 'UNAUTHENTICATED', statusCode: 401 }),
    );
  });
});
