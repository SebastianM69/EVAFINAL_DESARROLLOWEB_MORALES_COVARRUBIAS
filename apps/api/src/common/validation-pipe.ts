import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

const fieldLabels: Record<string, string> = {
  rut: 'RUT',
  rutEmpresa: 'RUT empresa',
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'Email',
  emailContacto: 'Email de contacto',
  password: 'Contraseña',
  sku: 'SKU',
  descripcionCorta: 'Descripción corta',
  descripcionLarga: 'Descripción larga',
  precioNeto: 'Precio neto',
  stockActual: 'Stock actual',
  stockMinimo: 'Stock mínimo',
  stockBajo: 'Stock bajo',
  stockAlto: 'Stock alto',
  rubro: 'Rubro',
  razonSocial: 'Razón social',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  nombreContacto: 'Nombre de contacto',
};

const englishDefaultMessage = /\b(must|should|longer than|shorter than|valid email|match the)\b/i;

function translateValidationMessage(property: string, constraint: string, message: string): string {
  const label = fieldLabels[property] ?? property;
  const numericValue = message.match(/-?\d+(?:\.\d+)?/)?.[0] ?? message;
  switch (constraint) {
    case 'isString':
      return `${label} debe ser texto.`;
    case 'isEmail':
      return `${label} debe ser un correo electrónico válido.`;
    case 'minLength':
      return `${label} debe tener al menos ${numericValue} caracteres.`;
    case 'maxLength':
      return `${label} no puede superar ${numericValue} caracteres.`;
    case 'isInt':
      return `${label} debe ser un número entero.`;
    case 'min':
      return `${label} debe ser mayor o igual que ${numericValue}.`;
    case 'isChileanRut':
      return `${label} debe ser un RUT chileno válido.`;
    case 'isNotEmpty':
      return `${label} es obligatorio.`;
    case 'whitelistValidation':
      return `${label} no está permitido.`;
    default:
      return englishDefaultMessage.test(message) ? `${label} no es válido.` : message;
  }
}

function collectFieldErrors(errors: ValidationError[]): Record<string, string[]> {
  return Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.entries(error.constraints ?? { invalid: 'Valor inválido.' }).map(
        ([constraint, message]) => translateValidationMessage(error.property, constraint, message),
      ),
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
