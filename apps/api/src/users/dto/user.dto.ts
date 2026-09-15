import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { IsChileanRut } from '../../common/validation/chilean-rut.js';

const corporateEmail = /^[^\s@]+@ventasfix\.cl$/i;

export class CreateUserDto {
  @IsString()
  @IsChileanRut()
  rut!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido!: string;

  @IsEmail()
  @Matches(corporateEmail, { message: 'El email debe pertenecer al dominio ventasfix.cl.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class UpdateUserDto {
  @IsString()
  @IsChileanRut()
  rut!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido!: string;

  @IsEmail()
  @Matches(corporateEmail, { message: 'El email debe pertenecer al dominio ventasfix.cl.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @IsOptional()
  password?: string;
}
