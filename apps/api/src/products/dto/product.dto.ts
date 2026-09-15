import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const decimalMoney = /^\d+(\.\d{1,2})?$/;
const skuPattern = /^[A-Za-z0-9_-]+$/;

export class ProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(skuPattern, { message: 'El SKU solo permite letras, números, guion y guion bajo.' })
  sku!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  descripcionCorta!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  descripcionLarga!: string;

  @IsString()
  @Matches(decimalMoney, {
    message: 'precioNeto debe ser un decimal no negativo con hasta 2 decimales.',
  })
  precioNeto!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockActual!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockBajo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockAlto!: number;
}
