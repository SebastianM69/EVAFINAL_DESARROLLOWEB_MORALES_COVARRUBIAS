import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/client.js';
import { ProductDto, ProductResponseDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

const productFormProperties = {
  sku: { type: 'string', example: 'SKU-001' },
  nombre: { type: 'string', example: 'Producto' },
  descripcionCorta: { type: 'string' },
  descripcionLarga: { type: 'string' },
  precioNeto: { type: 'string', example: '100.00' },
  stockActual: { type: 'string', example: '10' },
  stockMinimo: { type: 'string', example: '2' },
  stockBajo: { type: 'string', example: '4' },
  stockAlto: { type: 'string', example: '20' },
  image: { type: 'string', format: 'binary' },
};

@ApiTags('Products')
@ApiBearerAuth()
@Controller('productos')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN, Role.USER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findById(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'sku',
        'nombre',
        'descripcionCorta',
        'descripcionLarga',
        'precioNeto',
        'stockActual',
        'stockMinimo',
        'stockBajo',
        'stockAlto',
        'image',
      ],
      properties: productFormProperties,
    },
  })
  @UseInterceptors(
    FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  create(@Body() dto: ProductDto, @UploadedFile() file?: Express.Multer.File) {
    return this.productsService.create(dto, file);
  }

  @Put(':id')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'sku',
        'nombre',
        'descripcionCorta',
        'descripcionLarga',
        'precioNeto',
        'stockActual',
        'stockMinimo',
        'stockBajo',
        'stockAlto',
      ],
      properties: productFormProperties,
    },
  })
  @UseInterceptors(
    FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productsService.remove(id);
  }
}
