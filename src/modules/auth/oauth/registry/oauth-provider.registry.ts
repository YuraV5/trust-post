import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import { GoogleOAuthProvider } from '../providers/google.provider';
import { AppOAuthUnsupportedProviderException } from '../errors/oauth.errors';

@Injectable()
export class OAuthProviderRegistry {
  private readonly registry: Map<string, IOAuthProvider>;

  constructor(private readonly google: GoogleOAuthProvider) {
    this.registry = new Map<string, IOAuthProvider>([
      [AuthProvider.GOOGLE.toLowerCase(), this.google],
      // To add a new provider:
      // 1. Add its value to the AuthProvider Prisma enum
      // 2. Create a class implementing IOAuthProvider
      // 3. Inject it here and add an entry to the map
    ]);
  }

  get(provider: string): IOAuthProvider {
    const normalizedProvider = provider.trim().toLowerCase();
    const service = this.registry.get(normalizedProvider);
    if (!service) throw new AppOAuthUnsupportedProviderException(provider);
    return service;
  }
}
