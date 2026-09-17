import { createReadStream } from 'node:fs';
import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

import { ProductImageService } from './product-image.service.js';

@Controller('media/products')
export class MediaController {
  constructor(private readonly images: ProductImageService) {}

  @Get(':filename')
  async getImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.images.getFile(filename);
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(createReadStream(file.absolutePath), {
      type: file.mime,
      disposition: 'inline',
    });
  }
}
