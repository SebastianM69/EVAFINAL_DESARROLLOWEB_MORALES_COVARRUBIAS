import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/client.js';
import { DashboardService } from './dashboard.service.js';

class DashboardSummaryResponseDto {
  @ApiProperty({ example: 2 })
  usuarios!: number;

  @ApiProperty({ example: 1 })
  productos!: number;

  @ApiProperty({ example: 1 })
  clientes!: number;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN, Role.USER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  summary() {
    return this.dashboardService.summary();
  }
}
