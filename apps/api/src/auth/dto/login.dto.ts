import { Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@ventasfix.cl' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Admin12345!', format: 'password', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/\S/, { message: 'La contraseña no puede ser solo espacios.' })
  password!: string;
}

export class PublicUserResponseDto {
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

  @ApiProperty({ enum: ['ADMIN', 'USER'], example: 'ADMIN' })
  role!: 'ADMIN' | 'USER';
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: PublicUserResponseDto })
  user!: PublicUserResponseDto;
}
