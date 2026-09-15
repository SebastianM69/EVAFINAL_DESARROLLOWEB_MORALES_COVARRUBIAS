import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { normalizeRut } from '../common/validation/chilean-rut.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ClientDto } from './dto/client.dto.js';

export type ClientResponse = {
  id: number;
  rutEmpresa: string;
  rubro: string;
  razonSocial: string;
  telefono: string;
  direccion: string;
  nombreContacto: string;
  emailContacto: string;
};

const clientFields = {
  id: true,
  rutEmpresa: true,
  rubro: true,
  razonSocial: true,
  telefono: true,
  direccion: true,
  nombreContacto: true,
  emailContacto: true,
} as const;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ClientResponse[]> {
    return this.prisma.client.findMany({ select: clientFields, orderBy: { razonSocial: 'asc' } });
  }

  async findById(id: number): Promise<ClientResponse> {
    const client = await this.prisma.client.findUnique({ where: { id }, select: clientFields });
    if (!client) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }
    return client;
  }

  async create(dto: ClientDto): Promise<ClientResponse> {
    const rutEmpresa = normalizeRut(dto.rutEmpresa);
    await this.ensureUnique(rutEmpresa);
    return this.prisma.client.create({ data: this.toData(dto, rutEmpresa), select: clientFields });
  }

  async update(id: number, dto: ClientDto): Promise<ClientResponse> {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }
    const rutEmpresa = normalizeRut(dto.rutEmpresa);
    await this.ensureUnique(rutEmpresa, id);
    return this.prisma.client.update({
      where: { id },
      data: this.toData(dto, rutEmpresa),
      select: clientFields,
    });
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Cliente no encontrado.',
      });
    }
    await this.prisma.client.delete({ where: { id } });
  }

  private toData(dto: ClientDto, rutEmpresa: string) {
    const telefono = dto.telefono.replace(/\D/g, '');
    if (telefono.length < 8 || telefono.length > 15) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'El teléfono debe contener entre 8 y 15 dígitos.',
      });
    }

    return {
      rutEmpresa,
      rubro: dto.rubro.trim(),
      razonSocial: dto.razonSocial.trim(),
      telefono,
      direccion: dto.direccion.trim(),
      nombreContacto: dto.nombreContacto.trim(),
      emailContacto: dto.emailContacto.trim().toLowerCase(),
    };
  }

  private async ensureUnique(rutEmpresa: string, excludedId?: number): Promise<void> {
    const duplicate = await this.prisma.client.findUnique({ where: { rutEmpresa } });
    if (duplicate && duplicate.id !== excludedId) {
      throw new ConflictException({
        code: 'RESOURCE_CONFLICT',
        message: 'El RUT de empresa ya existe.',
      });
    }
  }
}
