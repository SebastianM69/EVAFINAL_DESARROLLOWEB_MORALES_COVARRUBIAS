import 'dotenv/config';

import argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient, Role } from '../src/generated/prisma/client.js';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createAdapter(): PrismaMariaDb {
  const databaseUrl = new URL(requiredEnv('DATABASE_URL'));
  const database = databaseUrl.pathname.replace(/^\//, '');

  return new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database,
    connectionLimit: 5,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

async function main(): Promise<void> {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount !== 1) {
      throw new Error('Database invariant violated: exactly one ADMIN is required.');
    }
    return;
  }

  const password = requiredEnv('BOOTSTRAP_ADMIN_PASSWORD');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.$transaction(async (transaction) => {
    const currentUserCount = await transaction.user.count();
    if (currentUserCount !== 0) {
      throw new Error('Bootstrap aborted because users already exist.');
    }

    await transaction.user.create({
      data: {
        rut: requiredEnv('BOOTSTRAP_ADMIN_RUT'),
        nombre: requiredEnv('BOOTSTRAP_ADMIN_NAME'),
        apellido: requiredEnv('BOOTSTRAP_ADMIN_LASTNAME'),
        email: requiredEnv('BOOTSTRAP_ADMIN_EMAIL').toLowerCase(),
        passwordHash,
        role: Role.ADMIN,
      },
    });
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
