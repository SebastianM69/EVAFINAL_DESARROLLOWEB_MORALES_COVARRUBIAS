import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaClient, Role } from '../generated/prisma/client.js';

function createAdapter(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 10,
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
  constructor(configService: ConfigService) {
    super({ adapter: createAdapter(configService.getOrThrow<string>('DATABASE_URL')) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const userCount = await this.user.count();
    const adminCount = await this.user.count({ where: { role: Role.ADMIN } });
    if (userCount > 0 && adminCount !== 1) {
      throw new Error('Database invariant violated: exactly one ADMIN is required.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
