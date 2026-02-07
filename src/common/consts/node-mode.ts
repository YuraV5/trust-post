export const AppNodeMode = {
  DEV: 'development',
  TEST: 'test',
  PROD: 'production',
} as const;

export type AppNodeMode = (typeof AppNodeMode)[keyof typeof AppNodeMode];
