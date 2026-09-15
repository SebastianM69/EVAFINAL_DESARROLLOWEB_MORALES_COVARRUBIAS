import {
  registerDecorator,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function normalizeRut(value: string): string {
  const compact = value.replace(/[.\s-]/g, '').toUpperCase();
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

export function isValidChileanRut(value: string): boolean {
  const normalized = normalizeRut(value);
  const [body, verifier] = normalized.split('-');
  if (!body || !verifier || !/^\d+$/.test(body) || !/^[\dK]$/.test(verifier)) {
    return false;
  }

  let multiplier = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return verifier === expected;
}

@ValidatorConstraint({ name: 'isChileanRut', async: false })
class ChileanRutConstraint {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidChileanRut(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser un RUT chileno válido.`;
  }
}

export function IsChileanRut(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyKey.toString(),
      ...(validationOptions ? { options: validationOptions } : {}),
      validator: ChileanRutConstraint,
    });
  };
}
