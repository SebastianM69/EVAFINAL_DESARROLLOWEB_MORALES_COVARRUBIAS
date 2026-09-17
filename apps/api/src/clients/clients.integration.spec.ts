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
const testJwtSecret = 'test-secret-for-ventasfix-clients-integration-32-chars';
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

function clientPayload(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    rutEmpresa: '12.345.678-5',
    rubro: 'Tecnología',
    razonSocial: 'Empresa de Prueba SpA',
    telefono: '+56 (9) 1234-5678',
    direccion: 'Avenida Principal 123',
    nombreContacto: 'Ana Contacto',
    emailContacto: 'CONTACTO@EMPRESA.CL',
    ...overrides,
  };
}

function readClientId(body: unknown): number {
  if (typeof body !== 'object' || body === null || !('id' in body) || typeof body.id !== 'number') {
    throw new Error('Integration response did not contain a client id.');
  }
  return body.id;
}

describe('VentasFix clients HTTP contract', () => {
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

  it('creates a client with canonical RUT, phone and email values', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    const response = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload())
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        rutEmpresa: '12345678-5',
        telefono: '56912345678',
        emailContacto: 'contacto@empresa.cl',
      }),
    );
  });

  it('allows USER to create and read clients', async () => {
    const userToken = await login('user@ventasfix.cl', userPassword);

    const created = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${userToken}`)
      .send(clientPayload())
      .expect(201);
    const clientId = readClientId(created.body);

    const listed = await request(httpServer)
      .get('/api/v1/clientes')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(listed.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: clientId })]),
    );
  });

  it('returns Spanish field validation messages', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    const response = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        clientPayload({
          rutEmpresa: '12.345.678-9',
          rubro: 'X',
          emailContacto: 'correo-invalido',
        }),
      )
      .expect(422);

    expect(response.body.fieldErrors).toEqual(
      expect.objectContaining({
        rutEmpresa: expect.arrayContaining(['RUT empresa debe ser un RUT chileno válido.']),
        rubro: expect.arrayContaining(['Rubro debe tener al menos 2 caracteres.']),
        emailContacto: expect.arrayContaining([
          'Email de contacto debe ser un correo electrónico válido.',
        ]),
      }),
    );
  });

  it('rejects duplicate RUT and phone values outside the significant-digit range', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload())
      .expect(201);

    const duplicate = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload({ razonSocial: 'Otra Empresa SpA' }))
      .expect(409);
    expect(duplicate.body).toEqual(
      expect.objectContaining({ code: 'RESOURCE_CONFLICT', statusCode: 409 }),
    );

    const invalidPhone = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload({ rutEmpresa: '9876543-3', telefono: '1234567890123456' }))
      .expect(422);
    expect(invalidPhone.body).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 422 }),
    );
  });

  it('updates and deletes a client, then returns 404', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);
    const created = await request(httpServer)
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload())
      .expect(201);
    const clientId = readClientId(created.body);

    const updated = await request(httpServer)
      .put(`/api/v1/clientes/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(clientPayload({ razonSocial: 'Empresa Actualizada SpA', telefono: '22223333' }))
      .expect(200);
    expect(updated.body).toEqual(
      expect.objectContaining({ razonSocial: 'Empresa Actualizada SpA', telefono: '22223333' }),
    );

    await request(httpServer)
      .delete(`/api/v1/clientes/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const missing = await request(httpServer)
      .get(`/api/v1/clientes/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(missing.body).toEqual(
      expect.objectContaining({ code: 'RESOURCE_NOT_FOUND', statusCode: 404 }),
    );
  });

  it('normalizes malformed route ids as invalid parameters', async () => {
    const adminToken = await login('admin@ventasfix.cl', adminPassword);

    const response = await request(httpServer)
      .get('/api/v1/clientes/not-an-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({ code: 'INVALID_PARAMETER', statusCode: 400 }),
    );
  });
});
