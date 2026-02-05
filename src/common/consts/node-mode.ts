export const NodeEnv = {
  DEV: 'development',
  TEST: 'test',
  PROD: 'production',
} as const;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];
