import { randomBytes } from 'node:crypto';

import argon2 from 'argon2';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthResult, AccessTokenPayload, PublicUser } from './auth.types.js';

const publicUserFields = {
  id: true,
  rut: true,
  nombre: true,
  apellido: true,
  email: true,
  role: true,
} as const;

type UserRecord = {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  role: PublicUser['role'];
};

type SessionWithUser = {
  id: number;
  userId: number;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: UserRecord;
};

type JwtTtl = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { ...publicUserFields, passwordHash: true },
    });

    if (!user || !(await this.verifyPassword(user.passwordHash, password))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const session = await this.findSession(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Sesión de refresh inválida.');
    }

    const nextRefreshToken = this.createRefreshToken();
    const nextRefreshHash = await argon2.hash(nextRefreshToken, { type: argon2.argon2id });
    const updateResult = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
      },
      data: {
        refreshTokenHash: nextRefreshHash,
        expiresAt: this.refreshExpiry(),
      },
    });

    if (updateResult.count !== 1) {
      throw new UnauthorizedException('Sesión de refresh inválida.');
    }

    return {
      accessToken: await this.createAccessToken(session.user),
      user: this.toPublicUser(session.user),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.findSession(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Sesión de refresh inválida.');
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserFields,
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    return user;
  }

  getRefreshCookieOptions(): {
    httpOnly: true;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    maxAge: number;
  } {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const ttlDays = this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      path: '/api/v1/auth',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    };
  }

  private async issueTokens(user: UserRecord & { passwordHash?: string }): Promise<AuthResult> {
    const refreshToken = this.createRefreshToken();
    const refreshTokenHash = await argon2.hash(refreshToken, { type: argon2.argon2id });
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      accessToken: await this.createAccessToken(user),
      user: this.toPublicUser(user),
      refreshToken,
    };
  }

  private toPublicUser(user: UserRecord): PublicUser {
    return {
      id: user.id,
      rut: user.rut,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
    };
  }

  private async createAccessToken(user: UserRecord): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TTL') as JwtTtl,
    });
  }

  private createRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private refreshExpiry(): Date {
    const ttlDays = this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  private async findSession(refreshToken: string): Promise<SessionWithUser | null> {
    const sessions = await this.prisma.authSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    for (const session of sessions) {
      if (await this.verifyPassword(session.refreshTokenHash, refreshToken)) {
        return session;
      }
    }

    return null;
  }

  private async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }
}
