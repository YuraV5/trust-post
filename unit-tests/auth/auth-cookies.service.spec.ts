import { AuthCookiesService } from '../../src/modules/auth/services/auth-cookies.service';
import { JwtToken } from '../../src/modules/security/consts';

describe('AuthCookiesService', () => {
  const responseMock = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets refresh cookie with secure=false in non-production mode', () => {
    const configMock = { get: jest.fn().mockReturnValue('development') };
    const service = new AuthCookiesService(configMock as any);

    service.setRefresh(responseMock as any, 'refresh-token');

    expect(responseMock.cookie).toHaveBeenCalledWith(
      JwtToken.REFRESH,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('clears refresh cookie', () => {
    const configMock = { get: jest.fn().mockReturnValue('development') };
    const service = new AuthCookiesService(configMock as any);

    service.clear(responseMock as any);

    expect(responseMock.clearCookie).toHaveBeenCalledWith(JwtToken.REFRESH, { path: '/' });
  });
});
