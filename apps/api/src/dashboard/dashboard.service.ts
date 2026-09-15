import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export type DashboardSummary = {
  usuarios: number;
  productos: number;
  clientes: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    const [usuarios, productos, clientes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.client.count(),
    ]);
    return { usuarios, productos, clientes };
  }
}
