import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';

import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import type { PublicUser } from './auth.types.js';

type StoredUser = PublicUser & { passwordHash: string };
type StoredSession = {
  id: number;
  userId: number;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: StoredUser;
};

const user: StoredUser = {
  id: 1,
  rut: '12345678-5',
  nombre: 'Admin',
  apellido: 'VentasFix',
  email: 'admin@ventasfix.cl',
  role: 'ADMIN',
  passwordHash: '',
};

function createAuthService() {
  const sessions: StoredSession[] = [];
  const prisma = {
    user: {
      findUnique: jest.fn(() => Promise.resolve(user)) as jest.MockedFunction<
        () => Promise<StoredUser | null>
      >,
    },
    authSession: {
      create: jest.fn(({ data }: { data: Omit<StoredSession, 'id' | 'revokedAt' | 'user'> }) => {
        const session: StoredSession = {
          id: sessions.length + 1,
          ...data,
          revokedAt: null,
          user,
        };
        sessions.push(session);
        return Promise.resolve(session);
      }),
      findMany: jest.fn(() =>
        Promise.resolve(sessions.filter((session) => session.revokedAt === null)),
      ),
      update: jest.fn(
        ({ where, data }: { where: { id: number }; data: Partial<StoredSession> }) => {
          const session = sessions.find((candidate) => candidate.id === where.id);
          if (!session) {
            return Promise.reject(new Error('Session not found'));
          }
          Object.assign(session, data);
          return Promise.resolve(session);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: number; revokedAt: null };
          data: Partial<StoredSession>;
        }) => {
          const session = sessions.find(
            (candidate) => candidate.id === where.id && candidate.revokedAt === where.revokedAt,
          );
          if (!session) {
            return Promise.resolve({ count: 0 });
          }
          Object.assign(session, data);
          return Promise.resolve({ count: 1 });
        },
      ),
    },
  };
  const jwt = {
    signAsync: jest.fn((payload: { sub: number }) => Promise.resolve(`access-${payload.sub}`)),
  };
  const configValues = {
    JWT_ACCESS_TTL: '15m',
    REFRESH_TOKEN_TTL_DAYS: 7,
    JWT_ACCESS_SECRET: 'test-secret',
    NODE_ENV: 'test',
  } as const;
  const config = {
    getOrThrow: jest.fn((key: keyof typeof configValues) => configValues[key]),
    get: jest.fn(
      (key: keyof typeof configValues, fallback: string) => configValues[key] ?? fallback,
    ),
  };

  return {
    service: new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    ),
    sessions,
    prisma,
    jwt,
  };
}

describe('AuthService', () => {
  beforeAll(async () => {
    user.passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
  });

  it('returns only public user data and persists a hashed refresh token on login', async () => {
    const { service, sessions } = createAuthService();

    const result = await service.login(user.email, 'correct-password');

    expect(result.accessToken).toBe('access-1');
    expect(result.user).toEqual({
      id: 1,
      rut: '12345678-5',
      nombre: 'Admin',
      apellido: 'VentasFix',
      email: 'admin@ventasfix.cl',
      role: 'ADMIN',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.refreshTokenHash).not.toBe(result.refreshToken);
    await expect(
      argon2.verify(sessions[0]?.refreshTokenHash ?? '', result.refreshToken),
    ).resolves.toBe(true);
  });

  it('rejects invalid credentials', async () => {
    const { service, prisma } = createAuthService();
    prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.login(user.email, 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates refresh tokens and rejects the previous token', async () => {
    const { service, sessions } = createAuthService();
    const firstLogin = await service.login(user.email, 'correct-password');

    const refreshed = await service.refresh(firstLogin.refreshToken);

    expect(refreshed.refreshToken).not.toBe(firstLogin.refreshToken);
    expect(refreshed.accessToken).toBe('access-1');
    expect(sessions[0]?.refreshTokenHash).not.toBe(firstLogin.refreshToken);
    await expect(service.refresh(firstLogin.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes a valid refresh session on logout', async () => {
    const { service, sessions } = createAuthService();
    const loginResult = await service.login(user.email, 'correct-password');

    await service.logout(loginResult.refreshToken);

    expect(sessions[0]?.revokedAt).toBeInstanceOf(Date);
    await expect(service.refresh(loginResult.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
