import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

const testDatabaseUrl = 'mysql://ventasfix:ventasfix_dev_password@localhost:3307/ventasfix_test';
const testJwtSecret = 'test-secret-for-ventasfix-swagger-32-characters';

process.env.NODE_ENV = 'test';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET = testJwtSecret;
process.env.JWT_ACCESS_TTL = '15m';
process.env.REFRESH_TOKEN_TTL_DAYS = '7';
process.env.SWAGGER_ENABLED = 'true';

let app: INestApplication;
let document: OpenAPIObject;
describe('VentasFix OpenAPI contract', () => {
  beforeAll(async () => {
    const { AppModule } = await import('./app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'media/products/:filename', method: RequestMethod.GET },
      ],
    });
    await app.init();

    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('VentasFix API').addBearerAuth().build(),
    );
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('publishes every SDD endpoint with the expected base paths', () => {
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/me',
        '/api/v1/dashboard/summary',
        '/api/v1/usuarios',
        '/api/v1/usuarios/{id}',
        '/api/v1/productos',
        '/api/v1/productos/{id}',
        '/api/v1/clientes',
        '/api/v1/clientes/{id}',
        '/health',
        '/media/products/{filename}',
      ]),
    );
  });

  it('marks protected operations as bearer-authenticated', () => {
    expect(document.paths['/api/v1/usuarios']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/api/v1/productos']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/api/v1/clientes']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/api/v1/dashboard/summary']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/api/v1/auth/me']?.get?.security).toEqual([{ bearer: [] }]);
  });

  it('documents product mutations as multipart with a required create image', () => {
    const requestBody = document.paths['/api/v1/productos']?.post?.requestBody;
    const multipart =
      requestBody && 'content' in requestBody
        ? requestBody.content['multipart/form-data']
        : undefined;

    expect(multipart).toBeDefined();
    expect(multipart?.schema).toEqual(
      expect.objectContaining({
        type: 'object',
        required: expect.arrayContaining(['image', 'precioNeto', 'stockActual']),
      }),
    );
  });

  it('documents request properties and response payloads', () => {
    expect(document.components?.schemas?.LoginDto).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          email: expect.any(Object),
          password: expect.any(Object),
        }),
      }),
    );
    expect(document.components?.schemas?.ProductResponseDto).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          precioNeto: expect.any(Object),
          precioVenta: expect.any(Object),
          imageUrl: expect.any(Object),
        }),
      }),
    );

    const productsResponse = document.paths['/api/v1/productos']?.get?.responses?.['200'];
    expect(productsResponse).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: { type: 'array', items: { $ref: '#/components/schemas/ProductResponseDto' } },
          }),
        }),
      }),
    );
  });
});
