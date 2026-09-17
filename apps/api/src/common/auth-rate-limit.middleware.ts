import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import type { NestMiddleware } from '@nestjs/common';

const windowMs = 60_000;
const limits: Record<'login' | 'refresh', number> = {
  login: 5,
  refresh: 30,
};

type RequestWindow = {
  timestamps: number[];
};

export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly windows = new Map<string, RequestWindow>();

  use(request: Request, response: Response, next: NextFunction): void {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    const route = request.originalUrl.split('?')[0] ?? '';
    const endpoint = route.endsWith('/auth/login')
      ? 'login'
      : route.endsWith('/auth/refresh')
        ? 'refresh'
        : undefined;
    if (!endpoint) {
      next();
      return;
    }
    const limit = limits[endpoint];

    const now = Date.now();
    const key = `${request.ip}:${endpoint}`;
    const window = this.windows.get(key) ?? { timestamps: [] };
    window.timestamps = window.timestamps.filter((timestamp) => now - timestamp < windowMs);
    if (window.timestamps.length >= limit) {
      const requestId = request.header('x-request-id') ?? randomUUID();
      response.status(429).json({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
        requestId,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    window.timestamps.push(now);
    this.windows.set(key, window);
    next();
  }
}
