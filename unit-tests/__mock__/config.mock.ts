const config: Record<string, string> = {
  'jwt.issuer': 'test-issuer',
  'jwt.accessSecret': 'test-access-secret',
  'jwt.refreshSecret': 'test-refresh-secret',
  'jwt.accessExpiration': '15m',
  'jwt.refreshExpiration': '7d',
  'session.expiresInMs': '7d', // 7 днів
  nodeEnv: 'development',
};

export const ConfigServiceMock = {
  getOrThrow: jest.fn((key: string) => {
    return config[key] || null;
  }),
  get: jest.fn((key: string) => {
    return config[key] || null;
  }),
};
