import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'node/dist/**',
      '**/.gea/**',
      'node/apps/**/dist/**',
      'node/compute/native-cpp/simdjson/**',
    ],
  },
  {
    files: ['**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', performance: 'readonly' },
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.ts'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: '*', next: 'return' },
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'class', 'export', 'multiline-const', 'multiline-let', 'block-like'],
        },
        {
          blankLine: 'always',
          prev: ['function', 'class', 'export', 'multiline-const', 'multiline-let', 'block-like'],
          next: '*',
        },
      ],
      '@stylistic/lines-between-class-members': ['error', 'always'],
    },
  },
];
