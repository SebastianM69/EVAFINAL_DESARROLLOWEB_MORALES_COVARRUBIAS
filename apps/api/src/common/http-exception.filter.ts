import { randomUUID } from 'node:crypto';

import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from './request-id.middleware.js';

type ErrorResponse = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
};

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'INVALID_PARAMETER';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'RESOURCE_NOT_FOUND';
    case 409:
      return 'RESOURCE_CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = request.header(REQUEST_ID_HEADER) ?? randomUUID();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : 500;
    const rawResponse = isHttpException ? exception.getResponse() : undefined;
    const details = isErrorResponse(rawResponse) ? rawResponse : {};
    const code = details.code ?? codeForStatus(status);
    const message =
      status >= 500
        ? 'Ocurrió un error interno.'
        : Array.isArray(details.message)
          ? details.message.join(' ')
          : (details.message ?? 'La solicitud no pudo procesarse.');

    if (!isHttpException) {
      this.logger.error(`Unhandled exception requestId=${requestId}`);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      requestId,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(details.fieldErrors ? { fieldErrors: details.fieldErrors } : {}),
    });
  }
}
