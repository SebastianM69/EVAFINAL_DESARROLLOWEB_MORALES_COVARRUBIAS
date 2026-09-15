import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/client.js';
import { ClientDto } from './dto/client.dto.js';
import { ClientsService } from './clients.service.js';

@ApiBearerAuth()
@Controller('clientes')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN, Role.USER)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findById(id);
  }

  @Post()
  create(@Body() dto: ClientDto) {
    return this.clientsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.clientsService.remove(id);
  }
}
