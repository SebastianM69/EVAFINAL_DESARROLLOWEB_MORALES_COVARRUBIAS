import { ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/client.js';
import { DashboardService } from './dashboard.service.js';

@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN, Role.USER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboardService.summary();
  }
}
