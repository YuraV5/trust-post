export const APP_NODE_MODE = {
  DEV: 'development',
  TEST: 'test',
  PROD: 'production',
} as const;

export type APP_NODE_MODE = (typeof APP_NODE_MODE)[keyof typeof APP_NODE_MODE];
