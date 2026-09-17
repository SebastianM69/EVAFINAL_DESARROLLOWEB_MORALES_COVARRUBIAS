import { Transform } from 'class-transformer';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { IsChileanRut } from '../../common/validation/chilean-rut.js';

const corporateEmail = /^[^\s@]+@ventasfix\.cl$/i;

export class CreateUserDto {
  @ApiProperty({ example: '11111111-1' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsChileanRut()
  rut!: string;

  @ApiProperty({ example: 'Administrador' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'VentasFix' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido!: string;

  @ApiProperty({ example: 'usuario@ventasfix.cl' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @Matches(corporateEmail, { message: 'El email debe pertenecer al dominio ventasfix.cl.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Admin12345!', format: 'password', minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios.' })
  password!: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: '11111111-1' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsChileanRut()
  rut!: string;

  @ApiProperty({ example: 'Administrador' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'VentasFix' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido!: string;

  @ApiProperty({ example: 'usuario@ventasfix.cl' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @Matches(corporateEmail, { message: 'El email debe pertenecer al dominio ventasfix.cl.' })
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({
    example: 'NuevaClave123!',
    format: 'password',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios.' })
  @IsOptional()
  password?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '11111111-1' })
  rut!: string;

  @ApiProperty({ example: 'Administrador' })
  nombre!: string;

  @ApiProperty({ example: 'VentasFix' })
  apellido!: string;

  @ApiProperty({ example: 'admin@ventasfix.cl' })
  email!: string;

  @ApiProperty({ enum: ['ADMIN', 'USER'], example: 'USER' })
  role!: 'ADMIN' | 'USER';
}
