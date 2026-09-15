import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function collectFieldErrors(errors: ValidationError[]): Record<string, string[]> {
  return Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.values(error.constraints ?? { invalid: 'Valor inválido.' }),
    ]),
  );
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos inválidos.',
        fieldErrors: collectFieldErrors(errors),
      }),
  });
}
