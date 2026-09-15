import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AccessTokenPayload } from './auth.types.js';

export type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Autenticación requerida.');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Autenticación requerida.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: 'ventasfix-api',
        audience: 'ventasfix-clients',
      });

      if (typeof payload.sub !== 'number' || !payload.email || !payload.role) {
        throw new UnauthorizedException('Token inválido.');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido.');
    }
  }
}
