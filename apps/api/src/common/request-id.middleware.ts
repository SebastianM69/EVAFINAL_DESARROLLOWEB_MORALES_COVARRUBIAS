import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import type { NestMiddleware } from '@nestjs/common';

export const REQUEST_ID_HEADER = 'x-request-id';

export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
