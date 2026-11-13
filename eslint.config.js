import mantine from 'eslint-config-mantine';
import tseslint from 'typescript-eslint';

// Wrapper types and `{}`/`Object` mean "any non-nullish value"; use the primitive, Record<string, unknown> or unknown.
const restrictedTypes = Object.fromEntries(
  ['String', 'Boolean', 'Number', 'Symbol', 'Function', 'Object', '{}'].map((type) => [
    type,
    {
      message: `Avoid \`${type}\`: use a primitive, a function signature, Record<string, unknown> or unknown.`,
    },
  ])
);

export default tseslint.config(
  {
    ignores: [
      '**/coverage',
      '**/generated',
      '**/dist',
      '**/storybook-static',
      '**/*.{mjs,cjs,js,d.ts,d.mts}',
      'apps/web/.storybook/main.ts',
      // TypeORM migrations are generated
      'apps/api/src/migration',
    ],
  },
  // Shared base for both apps. The React and a11y rules only fire on JSX, so the API is unaffected by them.
  ...mantine,
  {
    // "detect" fails when ESLint runs from the repo root (lint-staged), where react is not installed
    settings: { react: { version: '19.3' } },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-restricted-types': ['error', { types: restrictedTypes }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        // PascalCase covers React components and classes
        { selector: 'variableLike', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
      ],
      'max-lines': ['error', 300],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 5],
      'max-params': ['error', 5],
      complexity: ['error', { max: 10 }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['../*'], message: "Import from '@/…' instead of a parent folder." }],
        },
      ],
    },
  },
  {
    // Makes consistent-type-imports skip decorated files: decorator metadata needs those imports at runtime.
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.story.tsx',
      '**/test-utils/**',
      '**/*.config.ts',
      '**/vitest.setup.ts',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-console': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  }
);
