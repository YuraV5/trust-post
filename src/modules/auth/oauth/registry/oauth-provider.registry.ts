import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import type { IOAuthProvider } from '../interfaces/oauth-provider';
import { GoogleOAuthProvider } from '../providers/google.provider';
import { AppOAuthUnsupportedProviderException } from '../errors/oauth.errors';
import { IOAuthProviderRegistry } from '../interfaces';

@Injectable()
export class OAuthProviderRegistry implements IOAuthProviderRegistry {
  private readonly registry: Map<string, IOAuthProvider>;

  constructor(private readonly google: GoogleOAuthProvider) {
    this.registry = new Map<string, IOAuthProvider>([
      [AuthProvider.GOOGLE, this.google],
      // To add a new provider:
      // 1. Add its value to the AuthProvider Prisma enum
      // 2. Create a class implementing IOAuthProvider
      // 3. Inject it here and add an entry to the map
    ]);
  }

  getProvider(providerKey: string): IOAuthProvider {
    const normalizedProvider = providerKey.trim();
    const service = this.registry.get(normalizedProvider);
    if (!service) throw new AppOAuthUnsupportedProviderException(providerKey);
    return service;
  }
}
