import { randomUUID } from 'node:crypto';

import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { createValidationPipe } from './common/validation-pipe.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const webOrigin = configService.getOrThrow<string>('WEB_ORIGIN');
  const swaggerEnabled = configService.getOrThrow<boolean>('SWAGGER_ENABLED');

  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.enableCors({ origin: webOrigin, credentials: true });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'media/products/:filename', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(createValidationPipe());
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.originalUrl.startsWith('/api/v1')) {
      response.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  app.useGlobalFilters(new HttpExceptionFilter());

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VentasFix API')
      .setDescription('API REST autenticada de VentasFix')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  app.use((request: Request, response: Response) => {
    const requestId = request.header('x-request-id') ?? randomUUID();
    response.status(404).json({
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'El recurso solicitado no existe.',
      requestId,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  });
}

void bootstrap().catch(() => {
  Logger.error('Application bootstrap failed', 'Bootstrap');
  process.exitCode = 1;
});
