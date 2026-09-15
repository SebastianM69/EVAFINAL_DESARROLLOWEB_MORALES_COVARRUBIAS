import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthService } from './auth.service.js';
import type { Response } from 'express';

import { AuthController } from './auth.controller.js';
import { REFRESH_COOKIE_NAME } from './auth.types.js';

const publicUser = {
  id: 1,
  rut: '12345678-5',
  nombre: 'Admin',
  apellido: 'VentasFix',
  email: 'admin@ventasfix.cl',
  role: 'ADMIN' as const,
};

const cookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: false,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

type AuthServiceMock = {
  login: jest.MockedFunction<AuthService['login']>;
  refresh: jest.MockedFunction<AuthService['refresh']>;
  logout: jest.MockedFunction<AuthService['logout']>;
  me: jest.MockedFunction<AuthService['me']>;
  getRefreshCookieOptions: jest.MockedFunction<AuthService['getRefreshCookieOptions']>;
};

function createController(): {
  controller: AuthController;
  authService: AuthServiceMock;
  response: { cookie: jest.Mock; clearCookie: jest.Mock };
} {
  const authService: AuthServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    getRefreshCookieOptions: jest.fn(() => cookieOptions),
  };
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  return {
    controller: new AuthController(authService as unknown as AuthService),
    authService,
    response,
  };
}

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns access data and stores refresh only in an HttpOnly cookie on login', async () => {
    const { controller, authService, response } = createController();
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: publicUser,
    });

    const result = await controller.login(
      { email: 'admin@ventasfix.cl', password: 'correct-password' },
      response as unknown as Response,
    );

    expect(result).toEqual({ accessToken: 'access-token', user: publicUser });
    expect(result).not.toHaveProperty('refreshToken');
    expect(authService.login).toHaveBeenCalledWith('admin@ventasfix.cl', 'correct-password');
    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      cookieOptions,
    );
  });

  it('rotates the refresh cookie and does not expose the new refresh token', async () => {
    const { controller, authService, response } = createController();
    authService.refresh.mockResolvedValue({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      user: publicUser,
    });

    const result = await controller.refresh(
      { cookies: { [REFRESH_COOKIE_NAME]: 'current-refresh-token' }, header: () => undefined },
      response as unknown as Response,
    );

    expect(result).toEqual({ accessToken: 'next-access-token', user: publicUser });
    expect(authService.refresh).toHaveBeenCalledWith('current-refresh-token');
    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'next-refresh-token',
      cookieOptions,
    );
  });

  it('rejects refresh without a cookie before calling the service', async () => {
    const { controller, authService, response } = createController();

    await expect(
      controller.refresh({ cookies: {}, header: () => undefined }, response as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.refresh).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('revokes the refresh session and clears the cookie on logout', async () => {
    const { controller, authService, response } = createController();
    authService.logout.mockResolvedValue(undefined);

    await controller.logout(
      { cookies: { [REFRESH_COOKIE_NAME]: 'refresh-token' }, header: () => undefined },
      response as unknown as Response,
    );

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, cookieOptions);
  });

  it('rejects logout without a cookie before calling the service', async () => {
    const { controller, authService, response } = createController();

    await expect(
      controller.logout({ cookies: {}, header: () => undefined }, response as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.logout).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('delegates /me to the authenticated user id', async () => {
    const { controller, authService } = createController();
    authService.me.mockResolvedValue(publicUser);

    const result = await controller.me({ user: { sub: 1 } } as never);

    expect(result).toEqual(publicUser);
    expect(authService.me).toHaveBeenCalledWith(1);
  });
});
