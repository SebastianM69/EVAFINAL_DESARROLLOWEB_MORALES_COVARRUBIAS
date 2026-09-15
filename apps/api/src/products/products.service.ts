import { Decimal } from 'decimal.js';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { ProductDto } from './dto/product.dto.js';
import { ProductImageService } from './product-image.service.js';

export type ProductResponse = {
  id: number;
  sku: string;
  nombre: string;
  descripcionCorta: string;
  descripcionLarga: string;
  imageUrl: string;
  precioNeto: string;
  precioVenta: string;
  stockActual: number;
  stockMinimo: number;
  stockBajo: number;
  stockAlto: number;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ProductImageService,
  ) {}

  async findAll(): Promise<ProductResponse[]> {
    const products = await this.prisma.product.findMany({ orderBy: { nombre: 'asc' } });
    return products.map((product) => this.toResponse(product));
  }

  async findById(id: number): Promise<ProductResponse> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }
    return this.toResponse(product);
  }

  async create(dto: ProductDto, file: Express.Multer.File | undefined): Promise<ProductResponse> {
    const sku = dto.sku.trim().toUpperCase();
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (existing) {
      throw new ConflictException({ code: 'RESOURCE_CONFLICT', message: 'El SKU ya existe.' });
    }

    const stored = await this.images.store(file);
    try {
      const product = await this.prisma.product.create({
        data: this.toData(dto, sku, stored.relativePath),
      });
      return this.toResponse(product);
    } catch (error) {
      await this.images.remove(stored.relativePath);
      throw error;
    }
  }

  async update(id: number, dto: ProductDto, file?: Express.Multer.File): Promise<ProductResponse> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    const sku = dto.sku.trim().toUpperCase();
    const duplicate = await this.prisma.product.findUnique({ where: { sku } });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException({ code: 'RESOURCE_CONFLICT', message: 'El SKU ya existe.' });
    }

    const stored = file ? await this.images.store(file) : undefined;
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: this.toData(dto, sku, stored?.relativePath ?? existing.imagePath),
      });
      if (stored) {
        await this.images.remove(existing.imagePath);
      }
      return this.toResponse(product);
    } catch (error) {
      if (stored) {
        await this.images.remove(stored.relativePath);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }
    await this.prisma.product.delete({ where: { id } });
    await this.images.remove(existing.imagePath);
  }

  private toData(dto: ProductDto, sku: string, imagePath: string) {
    const precioNeto = new Decimal(dto.precioNeto);
    const precioVenta = precioNeto
      .mul(new Decimal('1.19'))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return {
      sku,
      nombre: dto.nombre.trim(),
      descripcionCorta: dto.descripcionCorta.trim(),
      descripcionLarga: dto.descripcionLarga.trim(),
      imagePath,
      precioNeto: precioNeto.toFixed(2),
      precioVenta: precioVenta.toFixed(2),
      stockActual: dto.stockActual,
      stockMinimo: dto.stockMinimo,
      stockBajo: dto.stockBajo,
      stockAlto: dto.stockAlto,
    };
  }

  private toResponse(product: {
    id: number;
    sku: string;
    nombre: string;
    descripcionCorta: string;
    descripcionLarga: string;
    imagePath: string;
    precioNeto: Decimal | { toString(): string };
    precioVenta: Decimal | { toString(): string };
    stockActual: number;
    stockMinimo: number;
    stockBajo: number;
    stockAlto: number;
  }): ProductResponse {
    return {
      id: product.id,
      sku: product.sku,
      nombre: product.nombre,
      descripcionCorta: product.descripcionCorta,
      descripcionLarga: product.descripcionLarga,
      imageUrl: `/media/${product.imagePath}`,
      precioNeto: new Decimal(product.precioNeto.toString()).toFixed(2),
      precioVenta: new Decimal(product.precioVenta.toString()).toFixed(2),
      stockActual: product.stockActual,
      stockMinimo: product.stockMinimo,
      stockBajo: product.stockBajo,
      stockAlto: product.stockAlto,
    };
  }
}
