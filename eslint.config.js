import mantine from 'eslint-config-mantine';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...mantine,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
  ignores: [
    'coverage',
    'generated',
    'dist',
    'storybook-static',
    '**/*.{mjs,cjs,js,d.ts,d.mts}',
    './.storybook/main.ts',
  ],
});
