import { AuthProvider } from '@prisma/client';
import { IOAuthProvider } from './oauth-provider';

export interface IOAuthProviderRegistry {
  getProvider(providerKey: AuthProvider): IOAuthProvider;
}
