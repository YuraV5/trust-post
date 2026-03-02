export const APP_MODE = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type APP_MODE = (typeof APP_MODE)[keyof typeof APP_MODE];
