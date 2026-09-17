import { Transform, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const decimalMoney = /^\d+(\.\d{1,2})?$/;
const skuPattern = /^[A-Za-z0-9_-]+$/;

export class ProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(skuPattern, { message: 'El SKU solo permite letras, números, guion y guion bajo.' })
  sku!: string;

  @ApiProperty({ example: 'Producto de demostración' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ example: 'Descripción breve del producto.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  descripcionCorta!: string;

  @ApiProperty({ example: 'Descripción completa del producto.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  descripcionLarga!: string;

  @ApiProperty({ example: '100.00', type: String })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(decimalMoney, {
    message: 'precioNeto debe ser un decimal no negativo con hasta 2 decimales.',
  })
  precioNeto!: string;

  @ApiProperty({ example: 10, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockActual!: number;

  @ApiProperty({ example: 2, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo!: number;

  @ApiProperty({ example: 4, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockBajo!: number;

  @ApiProperty({ example: 20, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockAlto!: number;
}

export class ProductResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'SKU-001' })
  sku!: string;

  @ApiProperty({ example: 'Producto de demostración' })
  nombre!: string;

  @ApiProperty({ example: 'Descripción breve del producto.' })
  descripcionCorta!: string;

  @ApiProperty({ example: 'Descripción completa del producto.' })
  descripcionLarga!: string;

  @ApiProperty({ example: '/media/products/uuid.webp' })
  imageUrl!: string;

  @ApiProperty({ example: '100.00', type: String })
  precioNeto!: string;

  @ApiProperty({ example: '119.00', type: String })
  precioVenta!: string;

  @ApiProperty({ example: 10 })
  stockActual!: number;

  @ApiProperty({ example: 2 })
  stockMinimo!: number;

  @ApiProperty({ example: 4 })
  stockBajo!: number;

  @ApiProperty({ example: 20 })
  stockAlto!: number;
}
