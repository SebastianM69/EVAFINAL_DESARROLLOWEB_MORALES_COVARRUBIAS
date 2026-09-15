import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';

import type { Role } from '../generated/prisma/client.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { RolesGuard } from './roles.guard.js';

const adminPayload = {
  sub: 1,
  email: 'admin@ventasfix.cl',
  role: 'ADMIN' as Role,
};

function createAccessContext(authorization?: string): {
  context: ExecutionContext;
  request: { header: (name: string) => string | undefined; user?: typeof adminPayload };
} {
  const request = {
    header: (name: string) => (name === 'authorization' ? authorization : undefined),
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

function createRolesContext(role?: Role): ExecutionContext {
  const request = role === undefined ? {} : { user: { ...adminPayload, role } };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AccessTokenGuard', () => {
  it('rejects requests without a Bearer token', async () => {
    const jwtService = {
      verifyAsync: jest.fn() as jest.MockedFunction<JwtService['verifyAsync']>,
    };
    const configService = {
      getOrThrow: () => 'test-secret',
    } as unknown as ConfigService;
    const guard = new AccessTokenGuard(jwtService as unknown as JwtService, configService);

    await expect(guard.canActivate(createAccessContext().context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('verifies the JWT contract and attaches its identity to the request', async () => {
    const jwtService = {
      verifyAsync: jest.fn() as jest.MockedFunction<JwtService['verifyAsync']>,
    };
    jwtService.verifyAsync.mockResolvedValue(adminPayload);
    const configService = {
      getOrThrow: () => 'test-secret',
    } as unknown as ConfigService;
    const guard = new AccessTokenGuard(jwtService as unknown as JwtService, configService);
    const { context, request } = createAccessContext('Bearer access-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access-token', {
      secret: 'test-secret',
      issuer: 'ventasfix-api',
      audience: 'ventasfix-clients',
    });
    expect(request.user).toEqual(adminPayload);
  });

  it('rejects a JWT with an invalid subject claim', async () => {
    const jwtService = {
      verifyAsync: jest.fn() as jest.MockedFunction<JwtService['verifyAsync']>,
    };
    jwtService.verifyAsync.mockResolvedValue({ ...adminPayload, sub: '1' });
    const configService = {
      getOrThrow: () => 'test-secret',
    } as unknown as ConfigService;
    const guard = new AccessTokenGuard(jwtService as unknown as JwtService, configService);

    await expect(
      guard.canActivate(createAccessContext('Bearer invalid-token').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const requiredRoles: Role[] | undefined = undefined;
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createRolesContext())).toBe(true);
  });

  it('rejects a role-protected route without an authenticated user', () => {
    const requiredRoles: Role[] | undefined = ['ADMIN'];
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createRolesContext())).toThrow(UnauthorizedException);
  });

  it('forbids USER access to ADMIN-only routes', () => {
    const requiredRoles: Role[] | undefined = ['ADMIN'];
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createRolesContext('USER'))).toThrow(ForbiddenException);
  });

  it('allows USER access when USER is an allowed role', () => {
    const requiredRoles: Role[] | undefined = ['ADMIN', 'USER'];
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createRolesContext('USER'))).toBe(true);
  });
});
