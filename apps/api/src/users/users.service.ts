import argon2 from 'argon2';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { normalizeRut } from '../common/validation/chilean-rut.js';
import { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../auth/auth.types.js';
import type { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';

const publicUserFields = {
  id: true,
  rut: true,
  nombre: true,
  apellido: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: publicUserFields,
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findById(id: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserFields });
    if (!user) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const rut = normalizeRut(dto.rut);
    const email = dto.email.trim().toLowerCase();
    await this.ensureUnique(rut, email);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        rut,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        email,
        passwordHash,
        role: Role.USER,
      },
      select: publicUserFields,
    });

    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    }

    const rut = normalizeRut(dto.rut);
    const email = dto.email.trim().toLowerCase();
    await this.ensureUnique(rut, email, id);
    const password = dto.password;
    const passwordChanged = password !== undefined;
    const passwordHash = passwordChanged
      ? await argon2.hash(password, { type: argon2.argon2id })
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        rut,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        email,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: publicUserFields,
    });

    if (passwordChanged) {
      await this.prisma.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return user;
  }

  async remove(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    }
    if (user.role === Role.ADMIN) {
      throw new ConflictException({
        code: 'ADMIN_PROTECTED',
        message: 'El administrador único no puede eliminarse.',
      });
    }
    await this.prisma.user.delete({ where: { id } });
  }

  private async ensureUnique(rut: string, email: string, excludedId?: number): Promise<void> {
    const [rutUser, emailUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { rut } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);

    if ((rutUser && rutUser.id !== excludedId) || (emailUser && emailUser.id !== excludedId)) {
      throw new ConflictException({
        code: 'RESOURCE_CONFLICT',
        message: 'El RUT o email ya existe.',
      });
    }
  }
}
