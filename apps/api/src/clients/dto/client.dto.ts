import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { IsChileanRut } from '../../common/validation/chilean-rut.js';

export class ClientDto {
  @IsString()
  @IsChileanRut()
  rutEmpresa!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  rubro!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  razonSocial!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[+()\s\d-]+$/, { message: 'El teléfono contiene caracteres inválidos.' })
  telefono!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  direccion!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombreContacto!: string;

  @IsEmail()
  @MaxLength(254)
  emailContacto!: string;
}
