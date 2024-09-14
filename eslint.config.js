import mantine from 'eslint-config-mantine';
import tseslint from 'typescript-eslint';

export default tseslint.config(...mantine, {
  ignores: [
    'coverage',
    'generated',
    'dist',
    '**/*.{mjs,cjs,js,d.ts,d.mts}',
    './.storybook/main.ts',
  ],
});
