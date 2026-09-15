import { Module } from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { RequestIdMiddleware } from './common/request-id.middleware.js';
import { validateEnvironment } from './config/environment.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { ProductsModule } from './products/products.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    ClientsModule,
    DashboardModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          issuer: 'ventasfix-api',
          audience: 'ventasfix-clients',
        },
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    HttpExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
