import { OAuthGoogleService } from '../../src/modules/auth/services/google.service';

describe('OAuthGoogleService', () => {
  const configMock = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'frontUrl') return 'https://app.example.com';
      if (key === 'jwt.accessSecret') return 'secret';
      if (key === 'googleOAuth.clientId') return 'client-id';
      if (key === 'googleOAuth.clientSecret') return 'client-secret';
      if (key === 'googleOAuth.callbackUrl') return 'https://api.example.com/auth/google/callback';
      return '';
    }),
    get: jest.fn().mockReturnValue('7d'),
  };

  const jwtMock = {
    sign: jest.fn().mockReturnValue('state-token'),
    verify: jest.fn().mockReturnValue({ deviceId: 'device-1' }),
  };

  const service = new OAuthGoogleService(
    { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
    configMock as any,
    jwtMock as any,
    { generateAccess: jest.fn(), generateRefresh: jest.fn() } as any,
    { getSessionByUserIdAndDeviceId: jest.fn(), createOrUpdate: jest.fn() } as any,
    { transaction: jest.fn() } as any,
    { findAuthUserbyId: jest.fn(), findByEmail: jest.fn(), createByProvider: jest.fn() } as any,
    { findByProviderId: jest.fn(), update: jest.fn(), create: jest.fn() } as any,
    { createHash: jest.fn() } as any,
    { prepareForLogin: jest.fn() } as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not include refreshToken in success redirect fragment', () => {
    const url = (service as any).buildSuccessRedirectUrl('access-token', true, '/oauth/callback');

    expect(url).toContain('#');
    expect(url).toContain('accessToken=access-token');
    expect(url).toContain('provider=google');
    expect(url).toContain('isNewUser=true');
    expect(url).not.toContain('refreshToken=');
  });
});
