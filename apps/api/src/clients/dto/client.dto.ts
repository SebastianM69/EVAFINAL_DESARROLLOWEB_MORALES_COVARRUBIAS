import { Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { IsChileanRut } from '../../common/validation/chilean-rut.js';

export class ClientDto {
  @ApiProperty({ example: '12.345.678-5' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsChileanRut()
  rutEmpresa!: string;

  @ApiProperty({ example: 'Tecnología' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  rubro!: string;

  @ApiProperty({ example: 'Empresa de demostración SpA' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  razonSocial!: string;

  @ApiProperty({ example: '+56 (9) 1234-5678' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[+()\s\d-]+$/, { message: 'El teléfono contiene caracteres inválidos.' })
  telefono!: string;

  @ApiProperty({ example: 'Avenida Principal 123' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  direccion!: string;

  @ApiProperty({ example: 'Ana Contacto' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombreContacto!: string;

  @ApiProperty({ example: 'contacto@empresa.cl' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  emailContacto!: string;
}

export class ClientResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '12345678-5' })
  rutEmpresa!: string;

  @ApiProperty({ example: 'Tecnología' })
  rubro!: string;

  @ApiProperty({ example: 'Empresa de demostración SpA' })
  razonSocial!: string;

  @ApiProperty({ example: '56912345678' })
  telefono!: string;

  @ApiProperty({ example: 'Avenida Principal 123' })
  direccion!: string;

  @ApiProperty({ example: 'Ana Contacto' })
  nombreContacto!: string;

  @ApiProperty({ example: 'contacto@empresa.cl' })
  emailContacto!: string;
}
