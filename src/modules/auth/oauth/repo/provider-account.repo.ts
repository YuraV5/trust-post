import { AuthProvider, Prisma, ProviderAccount } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderAccountCreateInput, ProviderAccountUpdateInput } from '../types';
import { IProviderAccountRepo } from '../interfaces/provider-account.repo.interface';

@Injectable()
export class ProviderAccountRepo implements IProviderAccountRepo {
  constructor(private readonly db: PrismaService) {}

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<ProviderAccount | null> {
    return this.db.providerAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<ProviderAccount[]> {
    return this.db.providerAccount.findMany({ where: { userId } });
  }

  async create(data: ProviderAccountCreateInput, tx?: Prisma.TransactionClient): Promise<ProviderAccount> {
    return (tx ?? this.db).providerAccount.create({
      data: {
        provider: data.provider,
        providerId: data.providerId,
        userId: data.userId,
        providerData: data.providerData as Prisma.InputJsonValue,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
  }

  async update(id: string, data: ProviderAccountUpdateInput, tx?: Prisma.TransactionClient): Promise<ProviderAccount> {
    return (tx ?? this.db).providerAccount.update({
      where: { id },
      data: {
        providerData: data.providerData as Prisma.InputJsonValue,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
  }
}
