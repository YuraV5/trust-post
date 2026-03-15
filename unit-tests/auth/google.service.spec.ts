import { AuthProvider } from '@prisma/client';
import { GoogleOAuthProvider } from '../../src/modules/auth/oauth/providers/google.provider';
import { OAuthStateService } from '../../src/modules/auth/oauth/services/oauth-state.service';
import { OAuthService } from '../../src/modules/auth/oauth/services/oauth.service';
import { AppOAuthInvalidStateException } from '../../src/modules/auth/oauth/errors/oauth.errors';

// ─── Shared mocks ─────────────────────────────────────────────────────────────

const loggerMock = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() };

const configMock = {
  getOrThrow: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'frontUrl': 'https://app.example.com',
      'jwt.accessSecret': 'test-secret',
      'googleOAuth.clientId': 'client-id',
      'googleOAuth.clientSecret': 'client-secret',
      'googleOAuth.callbackUrl': 'https://api.example.com/auth/google/callback',
    };
    return map[key] ?? '';
  }),
  get: jest.fn().mockReturnValue('7d'),
};

// ─── GoogleOAuthProvider ──────────────────────────────────────────────────────

describe('GoogleOAuthProvider', () => {
  const provider = new GoogleOAuthProvider(loggerMock as any, configMock as any);

  beforeEach(() => jest.clearAllMocks());

  it('getProvider returns GOOGLE', () => {
    expect(provider.getProvider()).toBe(AuthProvider.GOOGLE);
  });

  it('getAuthorizationUrl builds correct Google URL with state', () => {
    const url = provider.getAuthorizationUrl('state-token');

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('state=state-token');
    expect(url).toContain('client_id=client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile');
  });
});

// ─── OAuthStateService ────────────────────────────────────────────────────────

describe('OAuthStateService', () => {
  const jwtMock = {
    sign: jest.fn().mockReturnValue('signed-state'),
    verify: jest.fn().mockReturnValue({
      provider: AuthProvider.GOOGLE,
      deviceId: 'device-1',
      redirectTo: '/oauth/callback',
    }),
  };

  const stateService = new OAuthStateService(jwtMock as any, configMock as any);

  beforeEach(() => jest.clearAllMocks());

  it('sign returns jwt token', () => {
    const token = stateService.sign({ provider: AuthProvider.GOOGLE, deviceId: 'device-1' });
    expect(token).toBe('signed-state');
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { provider: AuthProvider.GOOGLE, deviceId: 'device-1' },
      expect.objectContaining({ issuer: 'oauth-state', expiresIn: '10m' }),
    );
  });

  it('verify returns decoded payload', () => {
    const payload = stateService.verify('signed-state');
    expect(payload.deviceId).toBe('device-1');
    expect(payload.provider).toBe(AuthProvider.GOOGLE);
  });

  it('verify throws AppOAuthInvalidStateException on jwt error', () => {
    jwtMock.verify.mockImplementationOnce(() => { throw new Error('expired'); });
    expect(() => stateService.verify('bad-token')).toThrow(AppOAuthInvalidStateException);
  });

  it('verify throws when deviceId is missing from payload', () => {
    jwtMock.verify.mockReturnValueOnce({ provider: AuthProvider.GOOGLE });
    expect(() => stateService.verify('no-device-token')).toThrow(AppOAuthInvalidStateException);
  });
});

// ─── OAuthService — redirect URL shape ───────────────────────────────────────

describe('OAuthService.buildRedirectUrl', () => {
  const oauthService = new OAuthService(
    loggerMock as any,
    {} as any,          // registry — not used in this test
    {} as any,          // stateService — not used in this test
    {} as any,          // providerAccountRepo — not used in this test
    {} as any,          // sessionsService — not used in this test
    {} as any,          // sessionsPolicy — not used in this test
    {} as any,          // tokensService — not used in this test
    {} as any,          // passwordService — not used in this test
    {} as any,          // usersService — not used in this test
    {} as any,          // prisma — not used in this test
    configMock as any,
  );

  it('contains accessToken, provider and isNewUser in hash fragment', () => {
    const url = (oauthService as any).buildRedirectUrl('access-token', AuthProvider.GOOGLE, true, '/oauth/callback');

    expect(url).toContain('#');
    expect(url).toContain('accessToken=access-token');
    expect(url).toContain('provider=google');
    expect(url).toContain('isNewUser=true');
  });

  it('never exposes refreshToken in redirect URL', () => {
    const url = (oauthService as any).buildRedirectUrl('access-token', AuthProvider.GOOGLE, false);
    expect(url).not.toContain('refreshToken');
  });
});

