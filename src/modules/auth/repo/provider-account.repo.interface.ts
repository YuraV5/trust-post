import { AuthProvider, Prisma, ProviderAccount } from '@prisma/client';
import { ProviderAccountCreateInput, ProviderAccountUpdateInput } from '../types/google-provider';

export interface IProviderAccountRepo {
  findByProviderId(provider: AuthProvider, providerId: string): Promise<ProviderAccount | null>;
  findByUserId(userId: string): Promise<ProviderAccount[]>;
  create(data: ProviderAccountCreateInput, tx?: Prisma.TransactionClient): Promise<ProviderAccount>;
  update(id: string, data: ProviderAccountUpdateInput, tx?: Prisma.TransactionClient): Promise<ProviderAccount>;
}
