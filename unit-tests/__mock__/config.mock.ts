export const ConfigServiceMock = {
  getOrThrow: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.issuer': 'test-issuer',
      'jwt.accessSecret': 'test-access-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpiration': '15m',
      'jwt.refreshExpiration': '7d',
      nodeEnv: 'development',
    };
    return config[key] || null;
  }),
};
