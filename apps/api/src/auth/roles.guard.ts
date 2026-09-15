import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Role } from '../generated/prisma/client.js';
import type { AuthenticatedRequest } from './access-token.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Autenticación requerida.');
    }
    if (!requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException('No tienes permisos para esta operación.');
    }

    return true;
  }
}
