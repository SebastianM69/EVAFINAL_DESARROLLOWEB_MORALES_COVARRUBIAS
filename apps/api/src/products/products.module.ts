import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MediaController } from './media.controller.js';
import { ProductImageService } from './product-image.service.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, MediaController],
  providers: [ProductsService, ProductImageService],
})
export class ProductsModule {}
