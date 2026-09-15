import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';

import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

const allowedTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const maxBytes = 5 * 1024 * 1024;

export type StoredProductImage = {
  relativePath: string;
  absolutePath: string;
};

@Injectable()
export class ProductImageService {
  private readonly root = resolve(process.cwd(), 'media', 'products');

  async store(file: Express.Multer.File | undefined): Promise<StoredProductImage> {
    if (!file || file.size === 0) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'La imagen es obligatoria.',
      });
    }
    if (file.size > maxBytes) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'La imagen supera 5 MiB.',
      });
    }

    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || allowedTypes[detected.ext] !== detected.mime) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'La imagen debe ser JPEG, PNG o WebP.',
      });
    }

    await mkdir(this.root, { recursive: true });
    const filename = `${randomUUID()}.${detected.ext}`;
    const absolutePath = join(this.root, filename);
    await writeFile(absolutePath, file.buffer, { flag: 'wx' });

    return {
      relativePath: `products/${filename}`,
      absolutePath,
    };
  }

  async remove(relativePath: string): Promise<void> {
    await unlink(resolve(process.cwd(), 'media', relativePath)).catch(() => undefined);
  }

  async getFile(filename: string): Promise<{ absolutePath: string; mime: string }> {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) {
      throw new BadRequestException({
        code: 'INVALID_PARAMETER',
        message: 'Nombre de archivo inválido.',
      });
    }
    const absolutePath = join(this.root, filename);
    try {
      await stat(absolutePath);
    } catch {
      throw new BadRequestException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Imagen no encontrada.',
      });
    }
    const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    const mime = allowedTypes[extension];
    if (!mime) {
      throw new BadRequestException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Imagen no encontrada.',
      });
    }
    return { absolutePath, mime };
  }
}
