import { Module } from '@nestjs/common';

import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, RolesGuard],
  exports: [AuthService, AccessTokenGuard, RolesGuard],
})
export class AuthModule {}
