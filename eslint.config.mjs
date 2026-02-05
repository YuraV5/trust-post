// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'test/testcontainers-global-setup.ts',
      'test/testcontainers-global-teardown.ts',
      'test/e2e/**',
      'src/**/*.spec.ts',
      'src/**/test/**',
      'src/**/tests/**',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      // Allow `any` in development, but should be reduced over time
      '@typescript-eslint/no-explicit-any': 'off',

      // Prevent unhandled promises (runtime safety)
      '@typescript-eslint/no-floating-promises': 'error',

      // Warn about unsafe arguments without blocking development
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Warn about unsafe assignments to keep type safety visible
      '@typescript-eslint/no-unsafe-assignment': 'warn',

      // Warn when returning unsafe values from functions
      '@typescript-eslint/no-unsafe-return': 'warn',

      // Warn about unsafe method calls and member access (for any types)
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',

      // Enforce consistent formatting via Prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // Allow console logs during development, but keep them visible
      'no-console': 'error',

      // Prevent unused variables, but allow underscore-prefixed ones
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Enforce explicit return types for public functions (API stability)
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // Prevent accidental use of `require` in TypeScript
      '@typescript-eslint/no-var-requires': 'error',
    },
  },
);
